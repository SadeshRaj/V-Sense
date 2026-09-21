using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICloudinaryService _cloudinary;

    // Allowed self-registration roles for client registration
    private static readonly string[] AllowedRoles = { "Client" };

    public AuthController(
        ApplicationDbContext context,
        IConfiguration config,
        IMemoryCache cache,
        IHttpClientFactory httpClientFactory,
        ICloudinaryService cloudinary)
    {
        _context = context;
        _config = config;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _cloudinary = cloudinary;
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

        // Normalize role and default to Client
        var requestedRole = string.IsNullOrWhiteSpace(request.Role) ? "Client" : request.Role.Trim();

        // Format to title case (e.g., "client" -> "Client")
        requestedRole = char.ToUpper(requestedRole[0]) + requestedRole.Substring(1).ToLower();

        if (!AllowedRoles.Contains(requestedRole))
        {
            return BadRequest(new { message = "Invalid role selected. Allowed role is 'Client'." });
        }

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            NIC = request.NIC,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = requestedRole // Assigns "Client"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _cache.Remove($"VERIFIED_{request.PhoneNumber}");

        return Ok(new { message = "Registration successful. Please log in." });
    }

    // --- GARAGE / SERVICE CENTER REGISTRATION FLOW ---

    [HttpPost("register-garage")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> RegisterGarage(
        [FromForm] GarageRegisterRequestDto request,
        IFormFile brDocument)
    {
        // Validation
        if (brDocument == null || brDocument.Length == 0)
            return BadRequest(new { message = "Business Registration document is required." });

        if (request.Password != request.ConfirmPassword)
            return BadRequest(new { message = "Passwords do not match." });

        var role = request.Role?.Trim();
        if (role != "Garage" && role != "ServiceCenter")
            return BadRequest(new { message = "Role must be 'Garage' or 'ServiceCenter'." });

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (emailExists)
            return Conflict(new { message = "An account with this email already exists." });

        // Upload BR document to Cloudinary
        string brDocumentUrl;
        try
        {
            using var stream = brDocument.OpenReadStream();
            brDocumentUrl = await _cloudinary.UploadAsync(stream, brDocument.FileName, "br-documents");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to upload BR document: {ex.Message}" });
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            BusinessName = request.BusinessName,
            RegistrationNumber = request.RegistrationNumber,
            Phone = request.Phone,
            Address = request.Address,
            BrDocumentUrl = brDocumentUrl,
            ApprovalStatus = "Pending" // All new garages start as Pending
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Created(string.Empty, new GarageRegisterResponseDto(
            user.Id,
            user.BusinessName ?? string.Empty,
            user.Email,
            user.ApprovalStatus
        ));
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

        // Approval status check for Garage / Service Center accounts
        if (user.ApprovalStatus == "Pending")
        {
            return StatusCode(403, new { message = "Your account is awaiting admin approval." });
        }

        if (user.ApprovalStatus == "Rejected")
        {
            return StatusCode(403, new { message = "Your account registration has been rejected. Please contact support." });
        }

        var token = GenerateJwtToken(user);

        return Ok(new LoginResponseDto(
            token, user.Id, user.FullName, user.Email, user.Role, user.IsActive, user.CreatedAt
        ));
    }

    // --- HELPER METHODS ---

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
            new Claim("fullName", user.FullName),
            new Claim("businessName", user.BusinessName ?? string.Empty)
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