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
public class VehiclesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VehiclesController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ─── GET /api/Vehicles/search?vehicleNumber=WP CAQ-5834 ──────────────────
    // ─── GET /api/Vehicles/search?chassisNumber=... ──────────────────────────
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? vehicleNumber,
        [FromQuery] string? chassisNumber)
    {
        if (string.IsNullOrWhiteSpace(vehicleNumber) && string.IsNullOrWhiteSpace(chassisNumber))
            return BadRequest(new { message = "Please enter a vehicle number or chassis number." });

        Vehicle? vehicle = null;

        if (!string.IsNullOrWhiteSpace(vehicleNumber))
        {
            var cleanedNumber = vehicleNumber.Trim().ToLower().Replace(" ", "").Replace("-", "");
            vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => 
                    v.RegistrationNumber.ToLower().Replace(" ", "").Replace("-", "") == cleanedNumber);
        }
        else if (!string.IsNullOrWhiteSpace(chassisNumber))
        {
            var cleanChassis = chassisNumber.Trim().ToLower();
            vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => 
                    (v.ChassisNumber != null && v.ChassisNumber.ToLower() == cleanChassis) ||
                    (v.VIN != null && v.VIN.ToLower() == cleanChassis));
        }

        if (vehicle == null)
            return NotFound(new { message = "No vehicle found with the provided details." });

        return Ok(new VehicleDto(
            vehicle.Id,
            vehicle.RegistrationNumber,
            vehicle.ChassisNumber ?? vehicle.VIN ?? string.Empty,
            vehicle.Make,
            vehicle.Model,
            vehicle.ManufacturingYear,
            vehicle.Type ?? string.Empty,
            string.Empty,
            vehicle.FuelType ?? string.Empty));
    }
}
