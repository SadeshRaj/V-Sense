using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrator")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _email;

    public AdminController(ApplicationDbContext context, IEmailService email)
    {
        _context = context;
        _email = email;
    }

    // ─── GET /api/Admin/registrations/pending ───────────────────────────────
    [HttpGet("registrations/pending")]
    public async Task<IActionResult> GetPendingRegistrations()
    {
        var pending = await _context.Users
            .Where(u => (u.Role == "Garage" || u.Role == "ServiceCenter")
                        && u.ApprovalStatus == "Pending")
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new PendingRegistrationDto(
                u.Id,
                u.BusinessName ?? string.Empty,
                u.RegistrationNumber ?? string.Empty,
                u.FullName,
                u.Email,
                u.Phone ?? string.Empty,
                u.Address ?? string.Empty,
                u.Role,
                u.ApprovalStatus,
                u.BrDocumentUrl,
                u.CreatedAt))
            .ToListAsync();

        return Ok(pending);
    }

    // ─── GET /api/Admin/registrations/all ───────────────────────────────────
    [HttpGet("registrations/all")]
    public async Task<IActionResult> GetAllRegistrations()
    {
        var all = await _context.Users
            .Where(u => u.Role == "Garage" || u.Role == "ServiceCenter")
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new PendingRegistrationDto(
                u.Id,
                u.BusinessName ?? string.Empty,
                u.RegistrationNumber ?? string.Empty,
                u.FullName,
                u.Email,
                u.Phone ?? string.Empty,
                u.Address ?? string.Empty,
                u.Role,
                u.ApprovalStatus,
                u.BrDocumentUrl,
                u.CreatedAt))
            .ToListAsync();

        return Ok(all);
    }

    // ─── PUT /api/Admin/registrations/{id}/approve ──────────────────────────
    [HttpPut("registrations/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Registration not found." });

        if (user.Role != "Garage" && user.Role != "ServiceCenter")
            return BadRequest(new { message = "This action is only for Garage / Service Center accounts." });

        if (user.ApprovalStatus != "Pending")
            return BadRequest(new { message = $"Cannot approve an account with status '{user.ApprovalStatus}'." });

        user.ApprovalStatus = "Active";
        await _context.SaveChangesAsync();

        // Send approval email (non-blocking — errors are logged internally)
        _ = Task.Run(() => _email.SendApprovalEmailAsync(user.Email, user.BusinessName ?? user.FullName));

        return Ok(new ApprovalActionResponseDto(user.Id, user.ApprovalStatus, "Registration approved. Approval email sent."));
    }

    // ─── PUT /api/Admin/registrations/{id}/reject ───────────────────────────
    [HttpPut("registrations/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Registration not found." });

        if (user.Role != "Garage" && user.Role != "ServiceCenter")
            return BadRequest(new { message = "This action is only for Garage / Service Center accounts." });

        if (user.ApprovalStatus != "Pending")
            return BadRequest(new { message = $"Cannot reject an account with status '{user.ApprovalStatus}'." });

        user.ApprovalStatus = "Rejected";
        await _context.SaveChangesAsync();

        // Send rejection email (non-blocking)
        _ = Task.Run(() => _email.SendRejectionEmailAsync(user.Email, user.BusinessName ?? user.FullName));

        return Ok(new ApprovalActionResponseDto(user.Id, user.ApprovalStatus, "Registration rejected. Rejection email sent."));
    }
}
