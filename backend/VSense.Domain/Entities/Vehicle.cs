using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("Vehicles")]
public class Vehicle
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string RegistrationNumber { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? VIN { get; set; }

    [MaxLength(100)]
    public string? Make { get; set; }

    [MaxLength(100)]
    public string? Model { get; set; }

    public short? ManufacturingYear { get; set; }

    [MaxLength(100)]
    public string? EngineNumber { get; set; }

    [MaxLength(100)]
    public string? ChassisNumber { get; set; }

    [MaxLength(50)]
    public string? FuelType { get; set; }

    [MaxLength(50)]
    public string? Transmission { get; set; }

    [MaxLength(50)]
    public string? Color { get; set; }

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(CreatedBy))]
    public virtual User? Creator { get; set; }
}