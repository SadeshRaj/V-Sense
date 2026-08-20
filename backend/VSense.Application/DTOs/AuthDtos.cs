namespace VSense.Application.DTOs;

public record LoginRequestDto(string Email, string Password);

public record LoginResponseDto(
    string Token,
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt
);

public record RegisterRequestDto(
    string FullName,
    string NIC,
    string PhoneNumber,
    string Email,
    string Password,
    string? Role = "Buyer" // Added Role field with "Buyer" as default fallback
);

public record SendOtpRequestDto(string PhoneNumber);

public record VerifyOtpRequestDto(string PhoneNumber, string Otp);

public record ResetPasswordRequestDto(string PhoneNumber, string NewPassword);