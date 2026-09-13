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
}