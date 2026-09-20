namespace VSense.Application.DTOs;

// Returned after vehicle search
public record VehicleDto(
    Guid Id,
    string VehicleNumber,
    string ChassisNumber,
    string Make,
    string Model,
    int Year,
    string Color,
    string EngineCapacity,
    string FuelType
);
