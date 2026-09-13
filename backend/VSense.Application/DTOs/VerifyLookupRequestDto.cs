namespace VSense.Application.DTOs;

public class VerifyLookupRequestDto
{
    public string RegistrationNumber { get; set; } = string.Empty;
    public string ChassisNumber { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
}