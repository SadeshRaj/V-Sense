namespace VSense.Application.DTOs;

// Returned after vehicle search
public record VehicleDto(
    Guid Id,
    string RegistrationNumber,
    string ChassisNumber,
    string? Make,
    string? Model,
    short? ManufacturingYear,
    string Color,
    string EngineCapacity,
    string FuelType
);
