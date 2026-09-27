using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CheckupRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CheckupRequestsController(ApplicationDbContext context)
    {
        _context = context;
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value
                       ?? User.FindFirst("id")?.Value;

        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    // POST /api/CheckupRequests
    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] CreateCheckupRequestDto request)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid token or user context missing." });

        // Confirm the vehicle belongs to this owner
        var ownsVehicle = await _context.VehicleOwnerships
            .AnyAsync(vo => vo.UserId == userId && vo.VehicleId == request.VehicleId && vo.Status == "Active");

        if (!ownsVehicle)
            return BadRequest(new { message = "This vehicle is not linked to your account." });

        // Confirm the garage exists and is active/approved
        var garage = await _context.Organizations.FirstOrDefaultAsync(o => o.Id == request.OrganizationId);
        if (garage == null ||
            (garage.Status.ToLower() != "active" && garage.Status.ToLower() != "approved"))
        {
            return BadRequest(new { message = "Selected garage is not available for requests." });
        }

        var checkupRequest = new CheckupRequest
        {
            Id = Guid.NewGuid(),
            VehicleId = request.VehicleId,
            OwnerId = userId,
            OrganizationId = request.OrganizationId,
            RequestedDate = DateTime.SpecifyKind(request.RequestedDate, DateTimeKind.Utc),
            RequestedTime = DateTime.SpecifyKind(request.RequestedTime, DateTimeKind.Utc),
            OwnerMessage = request.OwnerMessage,
            Status = CheckupRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CheckupRequests.Add(checkupRequest);
        await _context.SaveChangesAsync();

        return Created(string.Empty, new { id = checkupRequest.Id, message = "Checkup request submitted." });
    }

    // GET /api/CheckupRequests/my-requests
    [HttpGet("my-requests")]
    public async Task<IActionResult> GetMyRequests()
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid token or user context missing." });

        var requests = await _context.CheckupRequests
            .AsNoTracking()
            .Where(cr => cr.OwnerId == userId)
            .Include(cr => cr.Vehicle)
            .Include(cr => cr.Organization)
            .OrderByDescending(cr => cr.CreatedAt)
            .Select(cr => new CheckupRequestDto(
                cr.Id,
                cr.VehicleId,
                cr.Vehicle != null ? cr.Vehicle.RegistrationNumber : null,
                cr.OrganizationId,
                cr.Organization != null ? cr.Organization.Name : null,
                cr.RequestedDate,
                cr.RequestedTime,
                cr.Status,
                cr.OwnerMessage,
                cr.GarageResponse,
                cr.CreatedAt,
                cr.UpdatedAt
            ))
            .ToListAsync();

        return Ok(requests);
    }

    // GET /api/CheckupRequests/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRequestById(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(new { message = "Invalid token or user context missing." });

        var cr = await _context.CheckupRequests
            .AsNoTracking()
            .Include(x => x.Vehicle)
            .Include(x => x.Organization)
            .FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == userId);

        if (cr == null)
            return NotFound(new { message = "Checkup request not found." });

        return Ok(new CheckupRequestDto(
            cr.Id,
            cr.VehicleId,
            cr.Vehicle?.RegistrationNumber,
            cr.OrganizationId,
            cr.Organization?.Name,
            cr.RequestedDate,
            cr.RequestedTime,
            cr.Status,
            cr.OwnerMessage,
            cr.GarageResponse,
            cr.CreatedAt,
            cr.UpdatedAt
        ));
    }
}