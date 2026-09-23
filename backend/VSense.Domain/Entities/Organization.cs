namespace VSense.Domain.Entities;

public class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Adress { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool? IsVerified { get; set; } = false;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? PasswordHash { get; set; }
    public string? BRDocumentUrl { get; set; }
    public string? ContactPersonName { get; set; }
}