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
    string Password
);

public record SendOtpRequestDto(string PhoneNumber);

public record VerifyOtpRequestDto(string PhoneNumber, string Otp);

// Updated: OTP is no longer needed here since it's verified in a separate step beforehand
public record ResetPasswordRequestDto(string PhoneNumber, string NewPassword);