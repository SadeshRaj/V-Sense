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

    // ─── GET /api/Admin/assigned-vehicles ───────────────────────────────────
    [HttpGet("assigned-vehicles")]
    public async Task<IActionResult> GetAssignedVehicles()
    {
        var assignedVehicles = await _context.VehicleOwnerships
            .AsNoTracking()
            .Include(vo => vo.Vehicle)
            .Include(vo => vo.User)
            .Include(vo => vo.Payment)
            .Where(vo => vo.Vehicle != null)
            .OrderByDescending(vo => vo.CreatedAt ?? vo.VerifiedAt)
            .Select(vo => new
            {
                id = vo.Id,
                vehicleId = vo.VehicleId,
                registrationNumber = vo.Vehicle!.RegistrationNumber,
                vin = vo.Vehicle.VIN ?? vo.Vehicle.ChassisNumber,
                make = vo.Vehicle.Make,
                model = vo.Vehicle.Model,
                manufacturingYear = vo.Vehicle.ManufacturingYear,
                fuelType = vo.Vehicle.FuelType,
                ownerName = vo.User != null ? vo.User.FullName : "Registered User",
                ownerEmail = vo.User != null ? vo.User.Email : "N/A",
                ownerPhone = vo.User != null ? vo.User.PhoneNumber : "N/A",
                status = vo.Status ?? "Active",
                paymentStatus = "Paid",
                amountPaid = vo.Payment != null ? vo.Payment.Amount : (decimal?)null,
                transactionId = vo.Payment != null ? vo.Payment.TrasactionId : null,
                assignedAt = vo.VerifiedAt ?? vo.CreatedAt ?? DateTime.UtcNow
            })
            .ToListAsync();

        return Ok(assignedVehicles);
    }

    // ─── GET /api/Admin/registrations/all ───────────────────────────────────
    [HttpGet("registrations/all")]
    public async Task<IActionResult> GetAllRegistrations()
    {
        var all = await _context.Organizations
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                businessName = o.Name ?? string.Empty,
                registrationNumber = string.Empty,
                fullName = o.ContactPersonName ?? string.Empty,
                email = o.Email ?? string.Empty,
                phone = o.Phone ?? string.Empty,
                address = o.Adress ?? string.Empty,
                role = o.Type ?? "Garage",
                approvalStatus = o.Status ?? "Pending",
                brDocumentUrl = o.BRDocumentUrl,
                createdAt = o.CreatedAt ?? DateTime.UtcNow,
                latitude = o.Latitude,
                longitude = o.Longitude
            })
            .ToListAsync();

        return Ok(all);
    }

    // ─── GET /api/Admin/registrations/pending ───────────────────────────────
    [HttpGet("registrations/pending")]
    public async Task<IActionResult> GetPendingRegistrations()
    {
        var pending = await _context.Organizations
            .Where(o => o.Status == "Pending")
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                id = o.Id,
                businessName = o.Name ?? string.Empty,
                registrationNumber = string.Empty,
                fullName = o.ContactPersonName ?? string.Empty,
                email = o.Email ?? string.Empty,
                phone = o.Phone ?? string.Empty,
                address = o.Adress ?? string.Empty,
                role = o.Type ?? "Garage",
                approvalStatus = o.Status ?? "Pending",
                brDocumentUrl = o.BRDocumentUrl,
                createdAt = o.CreatedAt ?? DateTime.UtcNow,
                latitude = o.Latitude,
                longitude = o.Longitude
            })
            .ToListAsync();

        return Ok(pending);
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

    // ─── DELETE /api/Admin/registrations/{id} ───────────────────────────────
    [HttpDelete("registrations/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var organization = await _context.Organizations.FindAsync(id);
        if (organization == null)
            return NotFound(new { message = "Partner registration not found." });

        // Safeguard: Check if partner has recorded service histories
        var hasServiceRecords = await _context.ServiceRecords
            .AnyAsync(sr => sr.GarageId == id);

        if (hasServiceRecords)
        {
            return BadRequest(new { message = "Cannot delete this organization because it has active vehicle service records. Reject or suspend it instead." });
        }

        _context.Organizations.Remove(organization);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Partner '{organization.Name}' deleted successfully." });
    }
}