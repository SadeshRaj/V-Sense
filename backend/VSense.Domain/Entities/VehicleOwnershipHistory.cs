using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("VehicleOwnershipHistory")]
public class VehicleOwnershipHistory
{
    [Key]
    [Column("id")] // FIX: Forces EF Core to use lowercase 'id' for PostgreSQL
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? VehicleId { get; set; }
    public string? OwnerName { get; set; }
    public DateTime? OwnershipStartDate { get; set; }
    public DateTime? OwnershipEndDate { get; set; }
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("VehicleId")]
    public Vehicle? Vehicle { get; set; }
}