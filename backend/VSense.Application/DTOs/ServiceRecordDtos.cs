namespace VSense.Application.DTOs;

// Request to create a service/maintenance record
// Note: GarageId is NOT in the request — it comes from the authenticated JWT claim
public record CreateServiceRecordRequestDto(
    Guid VehicleId,
    string Title,
    string Description,
    string PaymentMethod   // Must be "InsuranceClaim" or "CustomerPayment"
);

// Response after creating a service record
public record ServiceRecordResponseDto(
    Guid Id,
    Guid VehicleId,
    Guid GarageId,
    string Title,
    string Description,
    string PaymentMethod,
    List<string> PhotoUrls,
    DateTime CreatedAt
);
