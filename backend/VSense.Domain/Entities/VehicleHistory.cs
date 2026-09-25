using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("VehicleHistory")]
public class VehicleHistory
{
    [Key]
    [Column("id")] // FIX: Forces EF Core to use lowercase 'id' for PostgreSQL
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? VehicleId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? RegistrationDate { get; set; }
    public DateTime? RevenueLicenseLastRenewalDate { get; set; }
    public DateTime? RevenueLicenseExpiryDate { get; set; }
    public string? InsuranceStatus { get; set; }
    public string? InsuranceType { get; set; }
    public DateTime? InsuranceExpiryDate { get; set; }
    public string? RegistrationStatus { get; set; }
    public DateTime? LastOwnershipTransferDate { get; set; }
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("VehicleId")]
    public Vehicle? Vehicle { get; set; }
}