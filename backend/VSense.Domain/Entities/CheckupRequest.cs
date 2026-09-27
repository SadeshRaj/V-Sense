using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("CheckupRequests")]
public class CheckupRequest
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? VehicleId { get; set; }
    public Guid? OwnerId { get; set; }
    public Guid? OrganizationId { get; set; }

    public DateTime? RequestedDate { get; set; }
    public DateTime? RequestedTime { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; } = "Pending";

    public string? OwnerMessage { get; set; }
    public string? GarageResponse { get; set; }

    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties (no back-collections added to Vehicle/User/Organization
    // to avoid touching those files — keeps this change isolated)
    [ForeignKey(nameof(VehicleId))]
    public Vehicle? Vehicle { get; set; }

    [ForeignKey(nameof(OwnerId))]
    public User? Owner { get; set; }

    [ForeignKey(nameof(OrganizationId))]
    public Organization? Organization { get; set; }
}