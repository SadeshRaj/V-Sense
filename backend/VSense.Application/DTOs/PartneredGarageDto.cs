namespace VSense.Application.DTOs;

public record PartneredGarageDto(
    Guid Id,
    string Name,
    string? Type,
    string? Email,
    string? Phone,
    string? Address,
    string? ContactPersonName,
    decimal? Latitude,
    decimal? Longitude,
    string Status,
    double? DistanceInKm = null
);