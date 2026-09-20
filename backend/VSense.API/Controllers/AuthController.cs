using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ICloudinaryService _cloudinary;

    public AuthController(ApplicationDbContext context, IConfiguration config, ICloudinaryService cloudinary)
    {
        _context = context;
        _config = config;
        _cloudinary = cloudinary;
    }

    // ─── POST /api/Auth/login ────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (!user.IsActive)
        {
            return StatusCode(403, new { message = "Account is disabled." });
        }

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
            token,
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.IsActive,
            user.CreatedAt
        ));
    }

    // ─── POST /api/Auth/register-garage ─────────────────────────────────────
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

        var user = new Domain.Entities.User
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
            ApprovalStatus = "Pending"   // All new garages start as Pending
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

    // ─── JWT Token Generator ─────────────────────────────────────────────────
    private string GenerateJwtToken(Domain.Entities.User user)
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