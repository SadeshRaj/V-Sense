namespace VSense.Domain.Entities;

public class ServiceRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VehicleId { get; set; }
    
    // Linked to the Organization (Garage or ServiceCenter)
    public Guid OrganizationId { get; set; }
    
    // Optional: track the specific user/staff member who logged the record
    public Guid? PerformedById { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;  // "InsuranceClaim" | "CustomerPayment"
    public string PhotoUrls { get; set; } = string.Empty;      // Comma-separated Cloudinary URLs
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Vehicle? Vehicle { get; set; }
    public Organization? Organization { get; set; }
    public User? PerformedBy { get; set; }
}