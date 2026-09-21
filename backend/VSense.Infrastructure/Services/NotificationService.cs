using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using VSense.Application.DTOs;
using VSense.Application.Interfaces;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly ApplicationDbContext _context;

        public NotificationService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task SendBroadcastNotificationAsync(SendNotificationDto dto, Guid adminId)
        {
            var notification = new Notification
            {
                Title = dto.Title,
                Message = dto.Message,
                Category = dto.Category,
                ImageUrl = dto.ImageUrl,
                IsBroadcast = true,
                CreatedBy = adminId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Notifications.Add(notification);
            
            // Get all active users to create UserNotification entries
            var users = await _context.Users.Where(u => u.IsActive).Select(u => u.Id).ToListAsync();
            
            var userNotifications = users.Select(userId => new UserNotification
            {
                UserId = userId,
                NotificationId = notification.Id
            }).ToList();

            _context.UserNotifications.AddRange(userNotifications);
            await _context.SaveChangesAsync();
        }

        public async Task SendTargetedNotificationAsync(Guid userId, string title, string message, string category = "System", string? imageUrl = null)
        {
            var notification = new Notification
            {
                Title = title,
                Message = message,
                Category = category,
                ImageUrl = imageUrl,
                IsBroadcast = false,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Notifications.Add(notification);
            
            var userNotification = new UserNotification
            {
                UserId = userId,
                NotificationId = notification.Id
            };

            _context.UserNotifications.Add(userNotification);
            await _context.SaveChangesAsync();
        }

        public async Task<List<NotificationResponseDto>> GetUserNotificationsAsync(Guid userId)
        {
            return await _context.UserNotifications
                .Include(un => un.Notification)
                .Where(un => un.UserId == userId)
                .OrderByDescending(un => un.Notification.CreatedAt)
                .Select(un => new NotificationResponseDto
                {
                    Id = un.Notification.Id,
                    Title = un.Notification.Title,
                    Message = un.Notification.Message,
                    Category = un.Notification.Category,
                    ImageUrl = un.Notification.ImageUrl,
                    IsRead = un.IsRead,
                    CreatedAt = un.Notification.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<List<NotificationResponseDto>> GetSentNotificationsAsync(Guid adminId)
        {
            return await _context.Notifications
                .Where(n => n.CreatedBy == adminId)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NotificationResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    Category = n.Category,
                    ImageUrl = n.ImageUrl,
                    IsRead = true,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();
        }

        public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
        {
            var userNotification = await _context.UserNotifications
                .FirstOrDefaultAsync(un => un.UserId == userId && un.NotificationId == notificationId);

            if (userNotification != null && !userNotification.IsRead)
            {
                userNotification.IsRead = true;
                userNotification.ReadAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        
        public async Task<int> GetUnreadCountAsync(Guid userId)
        {
            return await _context.UserNotifications
                .CountAsync(un => un.UserId == userId && !un.IsRead);
        }
    }
}

