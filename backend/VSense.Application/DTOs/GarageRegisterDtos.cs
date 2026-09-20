namespace VSense.Application.DTOs;

// Request to register a Garage or Service Center
public record GarageRegisterRequestDto(
    string BusinessName,
    string RegistrationNumber,
    string FullName,          // Contact person full name
    string Email,
    string Password,
    string ConfirmPassword,
    string Phone,
    string Address,
    string Role               // "Garage" or "ServiceCenter"
);

// Returned after successful registration
public record GarageRegisterResponseDto(
    Guid Id,
    string BusinessName,
    string Email,
    string ApprovalStatus
);
