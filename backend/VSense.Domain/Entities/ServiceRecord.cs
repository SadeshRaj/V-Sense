namespace VSense.Domain.Entities;

public class ServiceRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VehicleId { get; set; }
    public Guid GarageId { get; set; }      // FK → User.Id (Garage or ServiceCenter user)
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;  // "InsuranceClaim" | "CustomerPayment"
    public string PhotoUrls { get; set; } = string.Empty;      // Comma-separated Cloudinary URLs
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Vehicle? Vehicle { get; set; }
    public User? Garage { get; set; }
}
