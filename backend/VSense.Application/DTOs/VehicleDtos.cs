using System.ComponentModel.DataAnnotations;

namespace VSense.Application.DTOs;

public record CreateVehicleDto(
    [Required] string RegistrationNumber,
    string? Vin,
    string? Make,
    string? Model,
    short? ManufacturingYear,
    string? EngineNumber,
    string? ChassisNumber,
    string? FuelType,
    string? Transmission,
    string? Color,
    string? ImageUrl
);

public record VehicleResponseDto(
    Guid Id,
    string RegistrationNumber,
    string? Vin,
    string? Make,
    string? Model,
    short? ManufacturingYear,
    string? EngineNumber,
    string? ChassisNumber,
    string? FuelType,
    string? Transmission,
    string? Color,
    string? ImageUrl,
    Guid CreatedBy,
    DateTime CreatedAt
);