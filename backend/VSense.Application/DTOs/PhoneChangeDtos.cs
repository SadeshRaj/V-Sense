namespace VSense.Application.DTOs;

// Body for POST /api/users/me/phone/send-otp
public record SendPhoneChangeOtpRequestDto(string NewPhoneNumber);

// Body for POST /api/users/me/phone/verify-otp
public record VerifyPhoneChangeOtpRequestDto(string NewPhoneNumber, string Otp);