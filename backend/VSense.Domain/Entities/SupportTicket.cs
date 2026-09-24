namespace VSense.Domain.Entities;

public class SupportTicket
{
    public Guid UserId { get; set; } // Primary Key (1 ticket per user)
    public string Status { get; set; } = "Open"; // "Open", "Resolved"
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }

}