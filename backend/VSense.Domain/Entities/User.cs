namespace VSense.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid(); // Auto-generated
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // "Administrator", "SeniorAppraiser", "Garage", "ServiceCenter"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // --- Garage / Service Center fields (null for Admin/Appraiser accounts) ---
    public string? BusinessName { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? BrDocumentUrl { get; set; }       // Cloudinary URL of uploaded BR document
    public string ApprovalStatus { get; set; } = "Active"; // "Active" | "Pending" | "Rejected"
}