using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("VehiclePoliceRecords")]
public class VehiclePoliceRecord
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? VehicleId { get; set; }
    public DateTime? IncidentDate { get; set; }
    public string? IncidentType { get; set; }
    public string? Description { get; set; }
    public string? Severity { get; set; }
    public string? PoliceStation { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("VehicleId")]
    public Vehicle? Vehicle { get; set; }
}