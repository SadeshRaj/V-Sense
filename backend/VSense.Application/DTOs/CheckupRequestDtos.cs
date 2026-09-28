namespace VSense.Application.DTOs;

// Sent by the owner (mobile app) to create a new request
public record CreateCheckupRequestDto(
    Guid VehicleId,
    Guid OrganizationId,
    DateTime RequestedDate,
    DateTime RequestedTime,
    string? OwnerMessage
);

// Returned for list/detail views — includes joined display fields so the
// Flutter app doesn't need extra lookups for vehicle/garage names
public record CheckupRequestDto(
    Guid Id,
    Guid? VehicleId,
    string? VehicleRegistrationNumber,
    Guid? OrganizationId,
    string? GarageName,
    DateTime? RequestedDate,
    DateTime? RequestedTime,
    string? Status,
    string? OwnerMessage,
    string? GarageResponse,
    DateTime? CreatedAt,
    DateTime? UpdatedAt
);

// Sent by the garage (web portal) when they can't do the requested slot
// and want to propose different availability instead
public record SuggestAlternativeRequestDto(string GarageResponse);

public static class CheckupRequestStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string AlternativeSuggested = "AlternativeSuggested";
}