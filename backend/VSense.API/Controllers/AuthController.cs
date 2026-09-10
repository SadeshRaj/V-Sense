using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;

    // Allowed self-registration roles
    private static readonly string[] AllowedRoles = { "Owner", "Buyer" };

    public AuthController(
        ApplicationDbContext context,
        IConfiguration config,
        IMemoryCache cache,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _config = config;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
    }

    // --- REGISTRATION OTP FLOW ---

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequestDto request)
    {
        if (!Regex.IsMatch(request.PhoneNumber, @"^07\d{8}$"))
            return BadRequest(new { message = "Invalid phone number format." });

        if (await _context.Users.AnyAsync(u => u.PhoneNumber == request.PhoneNumber))
            return BadRequest(new { message = "Phone number is already registered." });

        var otp = new Random().Next(1000, 9999).ToString();
        _cache.Set($"OTP_{request.PhoneNumber}", otp, TimeSpan.FromMinutes(5));

        await SendSmsAsync(request.PhoneNumber, $"Your V-Sense registration OTP is: {otp}. Valid for 5 minutes.");

        return Ok(new { message = "OTP sent successfully." });
    }

    [HttpPost("verify-otp")]
    public IActionResult VerifyOtp([FromBody] VerifyOtpRequestDto request)
    {
        if (_cache.TryGetValue($"OTP_{request.PhoneNumber}", out string? savedOtp) && savedOtp == request.Otp)
        {
            _cache.Remove($"OTP_{request.PhoneNumber}");
            _cache.Set($"VERIFIED_{request.PhoneNumber}", true, TimeSpan.FromMinutes(15));
            return Ok(new { message = "Phone number verified." });
        }
        return BadRequest(new { message = "Invalid or expired OTP." });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!_cache.TryGetValue($"VERIFIED_{request.PhoneNumber}", out bool isVerified) || !isVerified)
            return BadRequest(new { message = "Phone number is not verified. Please verify OTP first." });

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
            return BadRequest(new { message = "Email is already in use." });

        if (await _context.Users.AnyAsync(u => u.NIC.ToLower() == request.NIC.ToLower()))
            return BadRequest(new { message = "NIC is already registered." });

        // Normalize role and validate against allowed registration roles
        var requestedRole = string.IsNullOrWhiteSpace(request.Role) ? "Buyer" : request.Role.Trim();
        
        // Format to title case (e.g., "owner" -> "Owner")
        requestedRole = char.ToUpper(requestedRole[0]) + requestedRole.Substring(1).ToLower();

        if (!AllowedRoles.Contains(requestedRole))
        {
            return BadRequest(new { message = "Invalid role selected. Allowed roles are 'Owner' or 'Buyer'." });
        }

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            NIC = request.NIC,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = requestedRole // Assigns "Owner" or "Buyer"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _cache.Remove($"VERIFIED_{request.PhoneNumber}");

        return Ok(new { message = $"Registration successful as {requestedRole}. Please log in." });
    }

    // --- FORGOT PASSWORD OTP FLOW ---

    [HttpPost("forgot-password-otp")]
    public async Task<IActionResult> SendForgotPasswordOtp([FromBody] SendOtpRequestDto request)
    {
        if (!await _context.Users.AnyAsync(u => u.PhoneNumber == request.PhoneNumber))
            return BadRequest(new { message = "User with this phone number not found." });

        var otp = new Random().Next(1000, 9999).ToString();
        _cache.Set($"PWD_OTP_{request.PhoneNumber}", otp, TimeSpan.FromMinutes(5));

        await SendSmsAsync(request.PhoneNumber, $"Your V-Sense password reset OTP is: {otp}. Valid for 5 minutes.");

        return Ok(new { message = "OTP sent successfully." });
    }

    [HttpPost("verify-forgot-password-otp")]
    public IActionResult VerifyForgotPasswordOtp([FromBody] VerifyOtpRequestDto request)
    {
        if (_cache.TryGetValue($"PWD_OTP_{request.PhoneNumber}", out string? savedOtp) && savedOtp == request.Otp)
        {
            _cache.Remove($"PWD_OTP_{request.PhoneNumber}");
            _cache.Set($"PWD_VERIFIED_{request.PhoneNumber}", true, TimeSpan.FromMinutes(15));
            return Ok(new { message = "OTP verified successfully." });
        }
        return BadRequest(new { message = "Invalid or expired OTP." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        if (_cache.TryGetValue($"PWD_VERIFIED_{request.PhoneNumber}", out bool isVerified) && isVerified)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.PhoneNumber == request.PhoneNumber);
            if (user == null) return BadRequest(new { message = "User not found." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            _cache.Remove($"PWD_VERIFIED_{request.PhoneNumber}");
            return Ok(new { message = "Password reset successfully." });
        }
        return BadRequest(new { message = "Phone number not verified. Please verify OTP first." });
    }

    // --- LOGIN ---

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return StatusCode(403, new { message = "Account is disabled." });

        var token = GenerateJwtToken(user);

        return Ok(new LoginResponseDto(
            token, user.Id, user.FullName, user.Email, user.Role, user.IsActive, user.CreatedAt
        ));
    }

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

    private string GenerateJwtToken(User user)
    {
        var secret = _config["JwtSettings:Secret"];
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("fullName", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}