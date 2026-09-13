using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("Vehicles")]
public class Vehicle
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string RegistrationNumber { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string VIN { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Make { get; set; }

    [MaxLength(100)]
    public string? Model { get; set; }

    public short? ManufacturingYear { get; set; }

    [MaxLength(100)]
    public string? FuelType { get; set; }

    [MaxLength(100)]
    public string? ChassisNumber { get; set; }

    [MaxLength(50)]
    public string? Type { get; set; }

    [MaxLength(100)]
    public string? LicenseNumber { get; set; }
}