using System;
using System.Collections.Generic;

namespace VSense.Domain.Entities
{
    public class Notification
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = "System"; // Promotional, Reminder, Urgent, System
        public string? ImageUrl { get; set; }
        public bool IsBroadcast { get; set; } = false;
        
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public Guid? CreatedBy { get; set; } // Null if system generated
        
        public ICollection<UserNotification> UserNotifications { get; set; } = new List<UserNotification>();
    }
}

