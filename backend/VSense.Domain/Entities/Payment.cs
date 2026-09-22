// VSense.Domain/Entities/Payment.cs
namespace VSense.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string TrasactionId { get; set; } = null!;
    public decimal? Amount { get; set; }
    public string? Status { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public Guid? VehicleId { get; set; }

    public User? User { get; set; }
    public Vehicle? Vehicle { get; set; }
}