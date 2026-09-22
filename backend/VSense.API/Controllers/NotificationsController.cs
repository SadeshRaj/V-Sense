using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using VSense.Application.DTOs;
using VSense.Application.Interfaces;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace VSense.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpPost("broadcast")]
        [Authorize(Roles = "Admin,Administrator")]
        public async Task<IActionResult> Broadcast([FromBody] SendNotificationDto dto)
        {
            try 
            {
                var adminIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(adminIdString, out var adminId)) return Unauthorized();

                await _notificationService.SendBroadcastNotificationAsync(dto, adminId);
                return Ok(new { message = "Broadcast notification sent successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("my-notifications")]
        public async Task<IActionResult> GetMyNotifications()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            return Ok(notifications);
        }

        [HttpGet("sent-notifications")]
        [Authorize(Roles = "Admin,Administrator")]
        public async Task<IActionResult> GetSentNotifications()
        {
            var adminIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(adminIdString, out var adminId)) return Unauthorized();

            var notifications = await _notificationService.GetSentNotificationsAsync(adminId);
            return Ok(notifications);
        }

        [HttpPost("upload-image")]
        [Authorize(Roles = "Admin,Administrator")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

            var cloudName = Environment.GetEnvironmentVariable("CloudinarySettings__CloudName");
            var apiKey = Environment.GetEnvironmentVariable("CloudinarySettings__ApiKey");
            var apiSecret = Environment.GetEnvironmentVariable("CloudinarySettings__ApiSecret");

            if (string.IsNullOrEmpty(cloudName) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(apiSecret))
            {
                return StatusCode(500, "Cloudinary is not configured on the backend.");
            }

            var account = new Account(cloudName, apiKey, apiSecret);
            var cloudinary = new Cloudinary(account);

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "notifications"
            };

            var uploadResult = await cloudinary.UploadAsync(uploadParams);
            
            if (uploadResult.Error != null)
            {
                return StatusCode(500, uploadResult.Error.Message);
            }

            return Ok(new { url = uploadResult.SecureUrl.ToString() });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Administrator")]
        public async Task<IActionResult> DeleteNotification(Guid id)
        {
            var adminIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(adminIdString, out _)) return Unauthorized();

            await _notificationService.DeleteNotificationAsync(id);
            return Ok(new { message = "Notification deleted successfully." });
        }

        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            await _notificationService.MarkAsReadAsync(userId, id);
            return Ok(new { message = "Notification marked as read." });
        }
        
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }
    }
}
