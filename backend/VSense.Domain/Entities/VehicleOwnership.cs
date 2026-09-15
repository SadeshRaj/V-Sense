using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

public class VehicleOwnership
{
    public Guid Id { get; set; }
    public Guid? VehicleId { get; set; }
    public Guid? UserId { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? Status { get; set; }
    public Guid? PaymentId { get; set; }
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [ForeignKey("VehicleId")]
    public Vehicle? Vehicle { get; set; }

    [ForeignKey("PaymentId")]
    public Payment? Payment { get; set; }
}