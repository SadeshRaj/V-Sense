using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;

    // Same 07XXXXXXXX convention AuthController's registration OTP flow
    // uses, so both flows behave identically from the user's perspective.
    private static readonly Regex PhonePattern = new(@"^07\d{8}$");

    public UsersController(
        ApplicationDbContext context,
        IMemoryCache cache,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
    }

    // GET api/users/me
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid or expired session." });

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null)
            return NotFound(new { message = "User not found." });

        return Ok(ToProfileDto(user));
    }

    // PUT api/users/me
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserProfileRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid or expired session." });

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null)
            return NotFound(new { message = "User not found." });

        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new { message = "Full name is required." });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(new { message = "Phone number is required." });

        var emailInUse = await _context.Users.AnyAsync(u =>
            u.Id != user.Id && u.Email.ToLower() == request.Email.Trim().ToLower());
        if (emailInUse)
            return Conflict(new { message = "This email is already in use by another account." });

        var newPhone = request.PhoneNumber.Trim();

        // Phone number changes require a verified OTP first — see
        // POST /api/users/me/phone/send-otp and .../verify-otp below. The
        // verification is cached against this exact number, so editing the
        // number again after verifying invalidates the earlier check.
        if (newPhone != user.PhoneNumber)
        {
            var verifiedKey = PhoneVerifiedCacheKey(user.Id);
            if (!_cache.TryGetValue(verifiedKey, out string? verifiedPhone) || verifiedPhone != newPhone)
            {
                return BadRequest(new { message = "Please verify your new phone number with the OTP before saving." });
            }

            // One-time use: consume the verification so it can't be reused
            // for a different save attempt or replayed later.
            _cache.Remove(verifiedKey);
        }

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.PhoneNumber = newPhone;
        user.ProfilePictureUrl = request.ProfilePictureUrl;

        await _context.SaveChangesAsync();

        return Ok(ToProfileDto(user));
    }

    // --- PHONE NUMBER CHANGE OTP FLOW ---
    // Mirrors AuthController's registration OTP flow (same text.lk sender),
    // but scoped to the logged-in user and to one specific new number so a
    // verified code can't be replayed against a different number.

    // POST api/users/me/phone/send-otp
    [HttpPost("me/phone/send-otp")]
    public async Task<IActionResult> SendPhoneChangeOtp([FromBody] SendPhoneChangeOtpRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid or expired session." });

        var newPhone = request.NewPhoneNumber?.Trim() ?? string.Empty;

        if (!PhonePattern.IsMatch(newPhone))
            return BadRequest(new { message = "Invalid phone number format." });

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null)
            return NotFound(new { message = "User not found." });

        if (newPhone == user.PhoneNumber)
            return BadRequest(new { message = "That's already your current phone number." });

        var phoneInUse = await _context.Users.AnyAsync(u => u.Id != user.Id && u.PhoneNumber == newPhone);
        if (phoneInUse)
            return Conflict(new { message = "This phone number is already registered to another account." });

        var otp = new Random().Next(1000, 9999).ToString();
        _cache.Set(PhoneOtpCacheKey(user.Id), new PhoneOtpEntry(otp, newPhone), TimeSpan.FromMinutes(5));

        await SendSmsAsync(newPhone, $"Your V-Sense phone update OTP is: {otp}. Valid for 5 minutes.");

        return Ok(new { message = "OTP sent successfully." });
    }

    // POST api/users/me/phone/verify-otp
    [HttpPost("me/phone/verify-otp")]
    public IActionResult VerifyPhoneChangeOtp([FromBody] VerifyPhoneChangeOtpRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid or expired session." });

        var newPhone = request.NewPhoneNumber?.Trim() ?? string.Empty;

        if (_cache.TryGetValue(PhoneOtpCacheKey(userId.Value), out PhoneOtpEntry? entry) &&
            entry != null &&
            entry.Otp == request.Otp &&
            entry.NewPhoneNumber == newPhone)
        {
            _cache.Remove(PhoneOtpCacheKey(userId.Value));
            _cache.Set(PhoneVerifiedCacheKey(userId.Value), newPhone, TimeSpan.FromMinutes(15));
            return Ok(new { message = "Phone number verified." });
        }

        return BadRequest(new { message = "Invalid or expired OTP." });
    }

    private static string PhoneOtpCacheKey(Guid userId) => $"PHONE_CHANGE_OTP_{userId}";
    private static string PhoneVerifiedCacheKey(Guid userId) => $"PHONE_CHANGE_VERIFIED_{userId}";

    private record PhoneOtpEntry(string Otp, string NewPhoneNumber);

    // Same text.lk call AuthController uses for registration/reset OTPs.
    private async Task SendSmsAsync(string phoneNumber, string message)
    {
        var apiToken = Environment.GetEnvironmentVariable("TEXTLK_API_TOKEN");
        var senderId = Environment.GetEnvironmentVariable("TEXTLK_SENDER_ID");

        if (string.IsNullOrEmpty(apiToken) || string.IsNullOrEmpty(senderId))
            throw new Exception("SMS API configurations are missing.");

        var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, "https://app.text.lk/api/v3/sms/send");
        request.Headers.Add("Authorization", $"Bearer {apiToken}");
        request.Headers.Add("Accept", "application/json");

        var payload = new
        {
            recipient = phoneNumber,
            sender_id = senderId,
            type = "plain",
            message = message
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    private static UserProfileDto ToProfileDto(VSense.Domain.Entities.User user) => new(
        user.Id,
        user.FullName,
        user.Email,
        user.PhoneNumber,
        user.NIC,
        user.Role,
        user.ProfilePictureUrl,
        user.CreatedAt
    );

    // Handles the "sub" claim regardless of whether ASP.NET's JWT handler
    // has remapped it to ClaimTypes.NameIdentifier (default) or left it as
    // the raw "sub" claim (if MapInboundClaims = false in Program.cs).
    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue("sub");

        return Guid.TryParse(sub, out var id) ? id : null;
    }
}