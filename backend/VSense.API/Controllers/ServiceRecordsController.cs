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

    [HttpPost]
    [Authorize(Roles = "Garage,ServiceCenter")] // STRICTLY restricts creating records to Garages
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create(
        [FromForm] CreateServiceRecordRequestDto request,
        [FromForm] List<IFormFile>? photos)
    {
        try
        {
            if (!AllowedPaymentMethods.Contains(request.PaymentMethod))
                return BadRequest(new { message = "Payment method must be 'InsuranceClaim' or 'CustomerPayment'." });

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Service title is required." });

            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(new { message = "Service description is required." });

            // CORRECTED: Extract organization ID from the JWT token
            var orgIdClaim = User.FindFirst("organizationId")?.Value
                          ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("id")?.Value;

            if (string.IsNullOrEmpty(orgIdClaim) || !Guid.TryParse(orgIdClaim, out var organizationId))
                return Unauthorized(new { message = "Invalid authentication token." });

            // CORRECTED: Verify against the Organizations table
            var organizationExists = await _context.Organizations.AnyAsync(o => o.Id == organizationId);
            if (!organizationExists)
                return Unauthorized(new { message = "Garage user account not found in Organizations table." });

            var vehicle = await _context.Vehicles.FindAsync(request.VehicleId);
            if (vehicle == null)
                return NotFound(new { message = "Vehicle not found." });

            var photoUrls = new List<string>();
            if (photos != null && photos.Count > 0)
            {
                foreach (var photo in photos)
                {
                    if (photo.Length == 0) continue;
                    using var stream = photo.OpenReadStream();
                    var url = await _cloudinary.UploadAsync(stream, photo.FileName, "service-photos");
                    photoUrls.Add(url);
                }
            }

            var record = new ServiceRecord
            {
                Id = Guid.NewGuid(),
                VehicleId = request.VehicleId,
                GarageId = organizationId,
                Title = request.Title,
                Description = request.Description,
                PaymentMethod = request.PaymentMethod,
                OdometerReading = request.OdometerReading,
                PhotoUrls = string.Join(",", photoUrls),
                CreatedAt = DateTime.UtcNow
            };

            _context.ServiceRecords.Add(record);
            await _context.SaveChangesAsync();

            return Created(string.Empty, new ServiceRecordResponseDto
            {
                Id = record.Id,
                VehicleId = record.VehicleId,
                GarageId = record.GarageId,
                Title = record.Title,
                Description = record.Description,
                PaymentMethod = record.PaymentMethod,
                OdometerReading = record.OdometerReading,
                PhotoUrls = photoUrls,
                CreatedAt = record.CreatedAt
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpGet("vehicle/{vehicleId:guid}")]
    [Authorize] // Allows any authenticated user (Clients or Garages)
    public async Task<IActionResult> GetByVehicle(Guid vehicleId)
    {
        try
        {
            // SECURE OWNERSHIP CHECK FOR CLIENTS
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;

            if (userRole != "Garage" && userRole != "ServiceCenter" && userRole != "Administrator")
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("id")?.Value;
                if (Guid.TryParse(userIdStr, out var userId))
                {
                    // Verify the client actually owns this vehicle
                    var isOwner = await _context.VehicleOwnerships
                        .AnyAsync(vo => vo.VehicleId == vehicleId && vo.UserId == userId && vo.Status == "Active");

                    if (!isOwner)
                        return Forbid("You do not have active ownership rights to view this vehicle's history.");
                }
            }

            var records = await _context.ServiceRecords
                .Where(r => r.VehicleId == vehicleId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = records.Select(r => new ServiceRecordResponseDto
            {
                Id = r.Id,
                VehicleId = r.VehicleId,
                GarageId = r.GarageId,
                Title = r.Title,
                Description = r.Description,
                PaymentMethod = r.PaymentMethod,
                OdometerReading = r.OdometerReading,
                PhotoUrls = string.IsNullOrEmpty(r.PhotoUrls)
                    ? new List<string>()
                    : r.PhotoUrls.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                CreatedAt = r.CreatedAt
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    // ─── GET /api/ServiceRecords/my-records ───────────────────────────────
    [HttpGet("my-records")]
    [Authorize(Roles = "Garage,ServiceCenter")]
    public async Task<IActionResult> GetMyRecords()
    {
        try
        {
            // Extract the organization/garage ID from the JWT token
            var orgIdClaim = User.FindFirst("organizationId")?.Value
                          ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("id")?.Value;

            if (string.IsNullOrEmpty(orgIdClaim) || !Guid.TryParse(orgIdClaim, out var organizationId))
                return Unauthorized(new { message = "Invalid authentication token." });

            // Fetch records linked to this garage, explicitly including the Vehicle to get the RegistrationNumber
            var records = await _context.ServiceRecords
                .Include(r => r.Vehicle)
                .Where(r => r.GarageId == organizationId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    title = r.Title,
                    vehicleNumber = r.Vehicle != null ? r.Vehicle.RegistrationNumber : "Unknown",
                    description = r.Description,
                    paymentMethod = r.PaymentMethod,
                    odometerReading = r.OdometerReading,
                    // React frontend explicitly looks for the 'photos' property array
                    photos = string.IsNullOrEmpty(r.PhotoUrls)
                        ? new List<string>()
                        : r.PhotoUrls.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    createdAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(records);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }
}