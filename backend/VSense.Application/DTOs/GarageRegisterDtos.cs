namespace VSense.Application.DTOs;

public record GarageRegisterRequestDto(
    string BusinessName,
    string RegistrationNumber,
    string FullName,
    string Email,
    string Password,
    string ConfirmPassword,
    string Phone,
    string Address,
    string Role,
    decimal? Latitude,
    decimal? Longitude
);

public record GarageRegisterResponseDto(
    Guid Id,
    string BusinessName,
    string Email,
    string ApprovalStatus
);