using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;
using Xunit;

namespace VSense.Tests.Services;

public class NotificationServiceTests
{
    private ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task SendTargetedNotificationAsync_SavesNotificationAndUserMapping()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var service = new NotificationService(context);
        var userId = Guid.NewGuid();

        // Act
        await service.SendTargetedNotificationAsync(userId, "Checkup Update", "Your request has been confirmed.", "System");

        // Assert
        var userNotification = await context.UserNotifications
            .Include(un => un.Notification)
            .FirstOrDefaultAsync(un => un.UserId == userId);

        userNotification.Should().NotBeNull();
        userNotification!.Notification.Should().NotBeNull();
        userNotification.Notification!.Title.Should().Be("Checkup Update");
        userNotification.Notification.Message.Should().Be("Your request has been confirmed.");
        userNotification.IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task MarkAsReadAsync_WhenUnread_UpdatesIsReadAndReadAt()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var service = new NotificationService(context);
        var userId = Guid.NewGuid();

        await service.SendTargetedNotificationAsync(userId, "Reminder", "Bring your vehicle in today.");
        var notification = await context.Notifications.FirstAsync();

        // Act
        await service.MarkAsReadAsync(userId, notification.Id);

        // Assert
        var userNotification = await context.UserNotifications
            .FirstOrDefaultAsync(un => un.UserId == userId && un.NotificationId == notification.Id);

        userNotification.Should().NotBeNull();
        userNotification!.IsRead.Should().BeTrue();
        userNotification.ReadAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetUnreadCountAsync_ReturnsCorrectCountForUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var service = new NotificationService(context);
        var userId = Guid.NewGuid();

        await service.SendTargetedNotificationAsync(userId, "Notification 1", "Body 1");
        await service.SendTargetedNotificationAsync(userId, "Notification 2", "Body 2");

        // Act
        var unreadCount = await service.GetUnreadCountAsync(userId);

        // Assert
        unreadCount.Should().Be(2);
    }
}