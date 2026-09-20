using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

public class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Maps to PostgreSQL column "RegistrationNumber" (License plate: e.g. "WP CAQ-5834")
    public string RegistrationNumber { get; set; } = string.Empty;

    // Backward-compatible alias for VehicleNumber
    [NotMapped]
    public string VehicleNumber
    {
        get => RegistrationNumber;
        set => RegistrationNumber = value;
    }

    public string? ChassisNumber { get; set; }
    public string? VIN { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public short ManufacturingYear { get; set; }

    [NotMapped]
    public int Year
    {
        get => ManufacturingYear;
        set => ManufacturingYear = (short)value;
    }

    public string? FuelType { get; set; }
    public string? Type { get; set; }
    public string? LicenseNumber { get; set; }

    // Navigation
    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
}
