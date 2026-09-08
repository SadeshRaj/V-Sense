namespace VSense.Application.DTOs;

// Request body (Only needs email & password to log in)
public record LoginRequestDto(string Email, string Password);

// Response body (Returns all user information except password_hash)
public record LoginResponseDto(
    string Token, 
    Guid Id,
    string FullName,
    string Email, 
    string Role,
    bool IsActive,
    DateTime CreatedAt
);