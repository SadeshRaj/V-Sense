using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrator,Admin")]
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
        var pending = await _context.Organizations
            .Where(o => o.Status == "Pending")
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new PendingRegistrationDto(
                o.Id,
                o.Name ?? string.Empty,
                string.Empty,
                o.ContactPersonName ?? string.Empty,
                o.Email ?? string.Empty,
                o.Phone ?? string.Empty,
                o.Adress ?? string.Empty,
                o.Type ?? "Garage",
                o.Status,
                o.BRDocumentUrl,
                o.CreatedAt ?? DateTime.UtcNow))
            .ToListAsync();

        return Ok(pending);
    }

    // ─── GET /api/Admin/registrations/all ───────────────────────────────────
    [HttpGet("registrations/all")]
    public async Task<IActionResult> GetAllRegistrations()
    {
        var all = await _context.Organizations
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new PendingRegistrationDto(
                o.Id,
                o.Name ?? string.Empty,
                string.Empty,
                o.ContactPersonName ?? string.Empty,
                o.Email ?? string.Empty,
                o.Phone ?? string.Empty,
                o.Adress ?? string.Empty,
                o.Type ?? "Garage",
                o.Status,
                o.BRDocumentUrl,
                o.CreatedAt ?? DateTime.UtcNow))
            .ToListAsync();

        return Ok(all);
    }

    // ─── PUT /api/Admin/registrations/{id}/approve ──────────────────────────
    [HttpPut("registrations/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.Id == id);

        if (organization == null)
            return NotFound(new { message = "Registration not found." });

        if (organization.Status == "Active")
            return BadRequest(new { message = "Organization is already approved." });

        organization.Status = "Active";
        organization.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var recipientEmail = organization.Email;
        var recipientName = organization.ContactPersonName ?? organization.Name ?? "Partner";

        if (!string.IsNullOrEmpty(recipientEmail))
        {
            _ = Task.Run(() => _email.SendApprovalEmailAsync(recipientEmail, recipientName));
        }

        return Ok(new ApprovalActionResponseDto(organization.Id, "Active", "Registration approved. Approval email sent."));
    }

    // ─── PUT /api/Admin/registrations/{id}/reject ───────────────────────────
    [HttpPut("registrations/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.Id == id);

        if (organization == null)
            return NotFound(new { message = "Registration not found." });

        organization.Status = "Rejected";
        organization.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var recipientEmail = organization.Email;
        var recipientName = organization.ContactPersonName ?? organization.Name ?? "Partner";

        if (!string.IsNullOrEmpty(recipientEmail))
        {
            _ = Task.Run(() => _email.SendRejectionEmailAsync(recipientEmail, recipientName));
        }

        return Ok(new ApprovalActionResponseDto(organization.Id, "Rejected", "Registration rejected. Rejection email sent."));
    }
}