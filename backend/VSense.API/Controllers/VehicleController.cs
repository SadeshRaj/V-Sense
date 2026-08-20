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

    [HttpPost]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Extract User ID from JWT Token Claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid user identity token." });
        }

        // Validate unique RegistrationNumber
        var isRegExists = await _context.Vehicles
            .AnyAsync(v => v.RegistrationNumber.ToLower() == dto.RegistrationNumber.ToLower());
        if (isRegExists)
        {
            return BadRequest(new { message = "A vehicle with this registration number already exists." });
        }

        // Validate unique VIN if provided
        if (!string.IsNullOrWhiteSpace(dto.Vin))
        {
            var isVinExists = await _context.Vehicles
                .AnyAsync(v => v.VIN!.ToLower() == dto.Vin.ToLower());
            if (isVinExists)
            {
                return BadRequest(new { message = "A vehicle with this VIN already exists." });
            }
        }

        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = dto.RegistrationNumber,
            VIN = dto.Vin,
            Make = dto.Make,
            Model = dto.Model,
            ManufacturingYear = dto.ManufacturingYear,
            EngineNumber = dto.EngineNumber,
            ChassisNumber = dto.ChassisNumber,
            FuelType = dto.FuelType,
            Transmission = dto.Transmission,
            Color = dto.Color,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();

        var response = new VehicleResponseDto(
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
            vehicle.CreatedBy,
            vehicle.CreatedAt
        );

        return CreatedAtAction(nameof(GetVehicleById), new { id = vehicle.Id }, response);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetVehicleById(Guid id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null)
            return NotFound(new { message = "Vehicle not found." });

        var response = new VehicleResponseDto(
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
            vehicle.CreatedBy,
            vehicle.CreatedAt
        );

        return Ok(response);
    }

    [HttpGet("my-vehicles")]
    public async Task<IActionResult> GetMyVehicles()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("id")?.Value;

        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var vehicles = await _context.Vehicles
            .Where(v => v.CreatedBy == userId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new VehicleResponseDto(
                v.Id,
                v.RegistrationNumber,
                v.VIN,
                v.Make,
                v.Model,
                v.ManufacturingYear,
                v.EngineNumber,
                v.ChassisNumber,
                v.FuelType,
                v.Transmission,
                v.Color,
                v.CreatedBy,
                v.CreatedAt
            ))
            .ToListAsync();

        return Ok(vehicles);
    }
}