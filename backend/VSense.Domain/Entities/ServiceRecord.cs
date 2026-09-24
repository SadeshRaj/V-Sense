using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("ServiceRecords")]
public class ServiceRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid VehicleId { get; set; }

    public Guid GarageId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int OdometerReading { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string PhotoUrls { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("VehicleId")]
    public Vehicle? Vehicle { get; set; }

    // Correctly points to Organization
    [ForeignKey("GarageId")]
    public Organization? Organization { get; set; }
}