// VSense.Domain/Entities/VehicleOwnership.cs
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

    public User? User { get; set; }
    public Vehicle? Vehicle { get; set; }
    public Payment? Payment { get; set; }
}