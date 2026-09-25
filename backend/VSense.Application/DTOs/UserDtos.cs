namespace VSense.Application.DTOs;

// Returned by GET /api/users/me
public record UserProfileDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string? NIC,
    string Role,
    string? ProfilePictureUrl,
    DateTime CreatedAt
);

// Body for PUT /api/users/me
// NIC and Role are intentionally excluded — NIC is a fixed identity document
// and Role changes are an admin-only concern, not a self-service one.
public record UpdateUserProfileRequestDto(
    string FullName,
    string Email,
    string PhoneNumber,
    string? ProfilePictureUrl
);