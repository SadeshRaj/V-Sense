namespace VSense.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid(); // Auto-generated
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // "Administrator" or "Senior Appraiser"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}