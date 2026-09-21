using System;

namespace VSense.Domain.Entities
{
    public class UserNotification
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid UserId { get; set; }
        public Guid NotificationId { get; set; }
        
        public bool IsRead { get; set; } = false;
        public DateTimeOffset? ReadAt { get; set; }

        public Notification? Notification { get; set; }
        public User? User { get; set; }
    }
}

