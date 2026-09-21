namespace VSense.Domain.Entities;

public class SupportMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string SenderType { get; set; } = "Client"; // "Client" or "Admin"
    public Guid? SenderId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public bool IsReadByAdmin { get; set; } = false;
    public bool IsReadByClient { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User? User { get; set; }
}