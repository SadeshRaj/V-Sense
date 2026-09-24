namespace VSense.Application.DTOs;

// Used in Admin registrations list
public record PendingRegistrationDto(
    Guid Id,
    string BusinessName,
    string RegistrationNumber,
    string FullName,
    string Email,
    string Phone,
    string Address,
    string Role,
    string ApprovalStatus,
    string? BrDocumentUrl,
    DateTime CreatedAt,
    decimal? Latitude = null,
    decimal? Longitude = null
);

// Admin approve/reject action response
public record ApprovalActionResponseDto(
    Guid Id,
    string ApprovalStatus,
    string Message
);