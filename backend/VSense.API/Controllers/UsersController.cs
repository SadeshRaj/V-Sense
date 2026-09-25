using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
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

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.ProfilePictureUrl = request.ProfilePictureUrl;

        await _context.SaveChangesAsync();

        return Ok(ToProfileDto(user));
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