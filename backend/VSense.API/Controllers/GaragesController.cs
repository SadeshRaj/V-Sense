using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GaragesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public GaragesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("partnered")]
    public async Task<IActionResult> GetPartneredGarages(
        [FromQuery] double? userLat, 
        [FromQuery] double? userLng, 
        [FromQuery] double? radiusKm = 20.0)
    {
        // 1. Fetch only Active / Approved organizations
        var garages = await _context.Organizations
            .Where(o => o.Status.ToLower() == "active" || o.Status.ToLower() == "approved")
            .ToListAsync();

        // 2. Map entity to DTO & compute distance
        var result = garages.Select(g =>
        {
            double? distance = null;

            if (userLat.HasValue && userLng.HasValue && g.Latitude.HasValue && g.Longitude.HasValue)
            {
                distance = CalculateHaversineDistance(
                    userLat.Value, userLng.Value,
                    (double)g.Latitude.Value, (double)g.Longitude.Value);
            }

            return new PartneredGarageDto(
                g.Id,
                g.Name,
                g.Type,
                g.Email,
                g.Phone,
                g.Adress,
                g.ContactPersonName,
                g.Latitude,
                g.Longitude,
                g.Status,
                distance.HasValue ? Math.Round(distance.Value, 1) : null
            );
        }).AsEnumerable();

        // 3. Filter by distance radius if user position is provided and radiusKm > 0
        if (userLat.HasValue && userLng.HasValue)
        {
            if (radiusKm.HasValue && radiusKm.Value > 0)
            {
                result = result.Where(g => g.DistanceInKm == null || g.DistanceInKm <= radiusKm.Value);
            }
            // Sort nearest first
            result = result.OrderBy(g => g.DistanceInKm ?? double.MaxValue);
        }

        return Ok(result.ToList());
    }

    private static double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371.0;

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private static double ToRadians(double angle) => (Math.PI / 180) * angle;
}