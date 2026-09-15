using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
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

    [HttpPost("verify-lookup")]
    public async Task<IActionResult> VerifyLookup([FromBody] VerifyLookupRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.RegistrationNumber) ||
            string.IsNullOrWhiteSpace(request.ChassisNumber) ||
            string.IsNullOrWhiteSpace(request.LicenseNumber))
        {
            return BadRequest(new { message = "Registration number, chassis number, and license number are required." });
        }

        var regClean = request.RegistrationNumber.Trim().ToUpper();
        var chassisClean = request.ChassisNumber.Trim().ToUpper();
        var licenseClean = request.LicenseNumber.Trim().ToUpper();

        var vehicle = await _context.Vehicles.FirstOrDefaultAsync(v =>
            v.RegistrationNumber.ToUpper() == regClean &&
            v.ChassisNumber != null && v.ChassisNumber.ToUpper() == chassisClean &&
            v.LicenseNumber != null && v.LicenseNumber.ToUpper() == licenseClean);

        if (vehicle == null)
        {
            return NotFound(new { message = "No matching vehicle record found in state registry." });
        }

        return Ok(new
        {
            id = vehicle.Id,
            registrationNumber = vehicle.RegistrationNumber,
            make = vehicle.Make,
            model = vehicle.Model,
            manufacturingYear = vehicle.ManufacturingYear,
            fuelType = vehicle.FuelType,
            type = vehicle.Type,
            chassisNumber = vehicle.ChassisNumber,
            licenseNumber = vehicle.LicenseNumber
        });
    }

    [HttpGet("my-vehicles")]
    public async Task<IActionResult> GetMyVehicles()
    {
        // Extract logged-in user ID from JWT claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst("sub")?.Value 
                       ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Invalid token or user context missing." });
        }

        // Query VehicleOwnerships table joined with Vehicles table
        var myVehicles = await _context.VehicleOwnerships
            .AsNoTracking()
            .Where(vo => vo.UserId == userId && vo.Status == "Active")
            .Include(vo => vo.Vehicle)
            .Where(vo => vo.Vehicle != null)
            .Select(vo => new
            {
                id = vo.Vehicle!.Id,
                registrationNumber = vo.Vehicle.RegistrationNumber,
                make = vo.Vehicle.Make,
                model = vo.Vehicle.Model,
                manufacturingYear = vo.Vehicle.ManufacturingYear,
                fuelType = vo.Vehicle.FuelType,
                type = vo.Vehicle.Type,
                chassisNumber = vo.Vehicle.ChassisNumber,
                licenseNumber = vo.Vehicle.LicenseNumber,
                ownershipId = vo.Id,
                verifiedAt = vo.VerifiedAt,
                status = vo.Status
            })
            .ToListAsync();

        return Ok(myVehicles);
    }
}