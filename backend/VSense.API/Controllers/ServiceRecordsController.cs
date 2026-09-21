using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Garage,ServiceCenter")]
public class ServiceRecordsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICloudinaryService _cloudinary;

    private static readonly HashSet<string> AllowedPaymentMethods = new(StringComparer.OrdinalIgnoreCase)
        { "InsuranceClaim", "CustomerPayment" };

    public ServiceRecordsController(ApplicationDbContext context, ICloudinaryService cloudinary)
    {
        _context = context;
        _cloudinary = cloudinary;
    }

    // ─── POST /api/ServiceRecords ────────────────────────────────────────────
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(
        [FromForm] CreateServiceRecordRequestDto request,
        [FromForm] List<IFormFile>? photos)
    {
        if (!AllowedPaymentMethods.Contains(request.PaymentMethod))
            return BadRequest(new { message = "Payment method must be 'InsuranceClaim' or 'CustomerPayment'." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Service title is required." });

        if (string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(new { message = "Service description is required." });

        // Garage/ServiceCenter accounts ARE the Organization — there's no linked
        // User row for staff, so the org id comes straight from the JWT claim
        // set in AuthController.GenerateJwtToken(Organization organization).
        var orgIdClaim = User.FindFirst("organizationId")?.Value;

        if (string.IsNullOrEmpty(orgIdClaim) || !Guid.TryParse(orgIdClaim, out var organizationId))
            return Unauthorized(new { message = "Invalid authentication token." });

        var organizationExists = await _context.Organizations.AnyAsync(o => o.Id == organizationId);
        if (!organizationExists)
            return Unauthorized(new { message = "Organization account not found." });

        var vehicle = await _context.Vehicles.FindAsync(request.VehicleId);
        if (vehicle == null)
            return NotFound(new { message = "Vehicle not found." });

        var photoUrls = new List<string>();
        if (photos != null && photos.Count > 0)
        {
            foreach (var photo in photos)
            {
                if (photo.Length == 0) continue;
                try
                {
                    using var stream = photo.OpenReadStream();
                    var url = await _cloudinary.UploadAsync(stream, photo.FileName, "service-photos");
                    photoUrls.Add(url);
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { message = $"Failed to upload photo '{photo.FileName}': {ex.Message}" });
                }
            }
        }

        var record = new ServiceRecord
        {
            Id = Guid.NewGuid(),
            VehicleId = request.VehicleId,
            OrganizationId = organizationId,
            PerformedById = null, // no individual staff User accounts exist for garages
            Title = request.Title,
            Description = request.Description,
            PaymentMethod = request.PaymentMethod,
            PhotoUrls = string.Join(",", photoUrls),
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceRecords.Add(record);
        await _context.SaveChangesAsync();

        return Created(string.Empty, new ServiceRecordResponseDto(
            record.Id,
            record.VehicleId,
            record.OrganizationId, // Passed as GarageId parameter in DTO
            record.Title,
            record.Description,
            record.PaymentMethod,
            photoUrls,
            record.CreatedAt));
    }

    // ─── GET /api/ServiceRecords/vehicle/{vehicleId} ─────────────────────────
    [HttpGet("vehicle/{vehicleId:guid}")]
    public async Task<IActionResult> GetByVehicle(Guid vehicleId)
    {
        var records = await _context.ServiceRecords
            .Where(r => r.VehicleId == vehicleId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = records.Select(r => new ServiceRecordResponseDto(
            r.Id,
            r.VehicleId,
            r.OrganizationId,
            r.Title,
            r.Description,
            r.PaymentMethod,
            string.IsNullOrEmpty(r.PhotoUrls)
                ? new List<string>()
                : r.PhotoUrls.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            r.CreatedAt));

        return Ok(result);
    }
}