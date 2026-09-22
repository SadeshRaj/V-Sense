using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using VSense.Application.DTOs;

namespace VSense.Application.Interfaces
{
    public interface INotificationService
    {
        Task SendBroadcastNotificationAsync(SendNotificationDto dto, Guid adminId);
        Task SendTargetedNotificationAsync(Guid userId, string title, string message, string category = "System", string? imageUrl = null);
        Task<List<NotificationResponseDto>> GetUserNotificationsAsync(Guid userId);
        Task<List<NotificationResponseDto>> GetSentNotificationsAsync(Guid adminId);
        Task MarkAsReadAsync(Guid userId, Guid notificationId);
        Task<int> GetUnreadCountAsync(Guid userId);
        Task DeleteNotificationAsync(Guid notificationId);
    }
}

