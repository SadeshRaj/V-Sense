using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Application.Interfaces;
using Xunit;

namespace VSense.Tests.Controllers;

public class NotificationsControllerTests
{
    private readonly Mock<INotificationService> _mockNotificationService;

    public NotificationsControllerTests()
    {
        _mockNotificationService = new Mock<INotificationService>();
    }

    private NotificationsController CreateControllerWithClaims(string? userId = null)
    {
        var controller = new NotificationsController(_mockNotificationService.Object);
        var claims = new List<Claim>();

        if (userId != null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        }

        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        return controller;
    }

    #region Broadcast Tests

    [Fact]
    public async Task Broadcast_ValidAdmin_ReturnsOkResult()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(adminId.ToString());
        var dto = new SendNotificationDto { Title = "System Maintenance", Message = "Scheduled tonight" };

        _mockNotificationService
            .Setup(s => s.SendBroadcastNotificationAsync(dto, adminId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.Broadcast(dto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        _mockNotificationService.Verify(s => s.SendBroadcastNotificationAsync(dto, adminId), Times.Once);
    }

    [Fact]
    public async Task Broadcast_InvalidAdminClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: "not-a-valid-guid");
        var dto = new SendNotificationDto { Title = "Test", Message = "Test" };

        // Act
        var result = await controller.Broadcast(dto);

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
        _mockNotificationService.Verify(s => s.SendBroadcastNotificationAsync(It.IsAny<SendNotificationDto>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task Broadcast_ServiceThrowsException_Returns500InternalServerError()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(adminId.ToString());
        var dto = new SendNotificationDto { Title = "Test", Message = "Test" };

        _mockNotificationService
            .Setup(s => s.SendBroadcastNotificationAsync(dto, adminId))
            .ThrowsAsync(new Exception("Database connection failure"));

        // Act
        var result = await controller.Broadcast(dto);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    #endregion

    #region GetMyNotifications Tests

    [Fact]
    public async Task GetMyNotifications_ValidUser_ReturnsOkWithNotifications()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(userId.ToString());
        var expectedNotifications = new List<NotificationResponseDto>
        {
            new NotificationResponseDto { Id = Guid.NewGuid(), Title = "Welcome" }
        };

        _mockNotificationService
            .Setup(s => s.GetUserNotificationsAsync(userId))
            .ReturnsAsync(expectedNotifications);

        // Act
        var result = await controller.GetMyNotifications();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(expectedNotifications, okResult.Value);
    }

    [Fact]
    public async Task GetMyNotifications_InvalidUserClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: null);

        // Act
        var result = await controller.GetMyNotifications();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    #endregion

    #region GetSentNotifications Tests

    [Fact]
    public async Task GetSentNotifications_ValidAdmin_ReturnsOkWithNotifications()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(adminId.ToString());
        var expectedNotifications = new List<NotificationResponseDto>
        {
            new NotificationResponseDto { Id = Guid.NewGuid(), Title = "Sent Broadcast" }
        };

        _mockNotificationService
            .Setup(s => s.GetSentNotificationsAsync(adminId))
            .ReturnsAsync(expectedNotifications);

        // Act
        var result = await controller.GetSentNotifications();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(expectedNotifications, okResult.Value);
    }

    [Fact]
    public async Task GetSentNotifications_InvalidAdminClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: "invalid-guid");

        // Act
        var result = await controller.GetSentNotifications();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    #endregion

    #region UploadImage Tests

    [Fact]
    public async Task UploadImage_NullFile_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateControllerWithClaims(Guid.NewGuid().ToString());

        // Act
        var result = await controller.UploadImage(null!);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No file uploaded.", badRequest.Value);
    }

    [Fact]
    public async Task UploadImage_EmptyFile_ReturnsBadRequest()
    {
        // Arrange
        var controller = CreateControllerWithClaims(Guid.NewGuid().ToString());
        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.Length).Returns(0);

        // Act
        var result = await controller.UploadImage(mockFile.Object);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("No file uploaded.", badRequest.Value);
    }

    [Fact]
    public async Task UploadImage_MissingCloudinaryEnvVars_Returns500InternalServerError()
    {
        // Arrange
        var controller = CreateControllerWithClaims(Guid.NewGuid().ToString());
        var mockFile = new Mock<IFormFile>();
        mockFile.Setup(f => f.Length).Returns(100);

        Environment.SetEnvironmentVariable("CloudinarySettings__CloudName", null);
        Environment.SetEnvironmentVariable("CloudinarySettings__ApiKey", null);
        Environment.SetEnvironmentVariable("CloudinarySettings__ApiSecret", null);

        // Act
        var result = await controller.UploadImage(mockFile.Object);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Cloudinary is not configured on the backend.", statusResult.Value);
    }

    #endregion

    #region DeleteNotification Tests

    [Fact]
    public async Task DeleteNotification_ValidAdmin_ReturnsOkResult()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(adminId.ToString());

        _mockNotificationService
            .Setup(s => s.DeleteNotificationAsync(notificationId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.DeleteNotification(notificationId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        _mockNotificationService.Verify(s => s.DeleteNotificationAsync(notificationId), Times.Once);
    }

    [Fact]
    public async Task DeleteNotification_InvalidAdminClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: "invalid-guid");

        // Act
        var result = await controller.DeleteNotification(Guid.NewGuid());

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    #endregion

    #region MarkAsRead Tests

    [Fact]
    public async Task MarkAsRead_ValidUser_ReturnsOkResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(userId.ToString());

        _mockNotificationService
            .Setup(s => s.MarkAsReadAsync(userId, notificationId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await controller.MarkAsRead(notificationId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        _mockNotificationService.Verify(s => s.MarkAsReadAsync(userId, notificationId), Times.Once);
    }

    [Fact]
    public async Task MarkAsRead_InvalidUserClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: null);

        // Act
        var result = await controller.MarkAsRead(Guid.NewGuid());

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    #endregion

    #region GetUnreadCount Tests

    [Fact]
    public async Task GetUnreadCount_ValidUser_ReturnsOkWithCount()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var controller = CreateControllerWithClaims(userId.ToString());

        _mockNotificationService
            .Setup(s => s.GetUnreadCountAsync(userId))
            .ReturnsAsync(5);

        // Act
        var result = await controller.GetUnreadCount();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        _mockNotificationService.Verify(s => s.GetUnreadCountAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetUnreadCount_InvalidUserClaim_ReturnsUnauthorized()
    {
        // Arrange
        var controller = CreateControllerWithClaims(userId: "invalid-guid");

        // Act
        var result = await controller.GetUnreadCount();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    #endregion
}