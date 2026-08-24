using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class VehiclesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehiclesController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Helper method to extract and parse the User ID from JWT token claims.
    /// Supports standard NameIdentifier, sub (subject), and custom id claims.
    /// </summary>
    private bool TryGetUserId(out Guid userId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("sub")?.Value 
                       ?? User.FindFirst("id")?.Value;

        return Guid.TryParse(userIdClaim, out userId);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing user identity token." });
        }

        // Validate unique RegistrationNumber
        var cleanReg = dto.RegistrationNumber.Trim().ToLower();
        var isRegExists = await _context.Vehicles
            .AnyAsync(v => v.RegistrationNumber.ToLower() == cleanReg);

        if (isRegExists)
        {
            return BadRequest(new { message = "A vehicle with this registration number already exists." });
        }

        // Safe null-aware check for unique VIN
        if (!string.IsNullOrWhiteSpace(dto.Vin))
        {
            var cleanVin = dto.Vin.Trim().ToLower();
            var isVinExists = await _context.Vehicles
                .AnyAsync(v => v.VIN != null && v.VIN.ToLower() == cleanVin);

            if (isVinExists)
            {
                return BadRequest(new { message = "A vehicle with this VIN already exists." });
            }
        }

        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = dto.RegistrationNumber.Trim().ToUpper(),
            VIN = dto.Vin?.Trim().ToUpper(),
            Make = dto.Make?.Trim(),
            Model = dto.Model?.Trim(),
            ManufacturingYear = dto.ManufacturingYear,
            EngineNumber = dto.EngineNumber?.Trim(),
            ChassisNumber = dto.ChassisNumber?.Trim(),
            FuelType = dto.FuelType?.Trim(),
            Transmission = dto.Transmission?.Trim(),
            Color = dto.Color?.Trim(),
            ImageUrl = dto.ImageUrl?.Trim(),
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();

        var response = MapToResponseDto(vehicle);

        return CreatedAtAction(nameof(GetVehicleById), new { id = vehicle.Id }, response);
    }

    [HttpGet("my-vehicles")]
    public async Task<IActionResult> GetMyVehicles()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token claims." });
        }

        var vehicles = await _context.Vehicles
            .Where(v => v.CreatedBy == userId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => MapToResponseDto(v))
            .ToListAsync();

        return Ok(vehicles);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetVehicleById(Guid id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound(new { message = "Vehicle not found." });

        return Ok(MapToResponseDto(vehicle));
    }

    /// <summary>
    /// Centralized DTO mapper to keep response logic DRY and consistent.
    /// </summary>
    private static VehicleResponseDto MapToResponseDto(Vehicle vehicle) =>
        new(
            vehicle.Id,
            vehicle.RegistrationNumber,
            vehicle.VIN,
            vehicle.Make,
            vehicle.Model,
            vehicle.ManufacturingYear,
            vehicle.EngineNumber,
            vehicle.ChassisNumber,
            vehicle.FuelType,
            vehicle.Transmission,
            vehicle.Color,
            vehicle.ImageUrl,
            vehicle.CreatedBy,
            vehicle.CreatedAt
        );
}