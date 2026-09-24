using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VSense.Application.Common;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using VSense.API.Hubs;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly Cloudinary _cloudinary;
    private readonly IHubContext<SupportHub> _hubContext;

    public SupportController(
        ApplicationDbContext context,
        IOptions<CloudinarySettings> cloudinaryOptions,
        IHubContext<SupportHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
        var config = cloudinaryOptions.Value;
        var account = new Account(config.CloudName, config.ApiKey, config.ApiSecret);
        _cloudinary = new Cloudinary(account);
    }

    private Guid GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("id")?.Value
                      ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(idClaim, out var id) ? id : Guid.Empty;
    }

    private async Task EnsureTicketExists(Guid userId)
    {
        var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.UserId == userId);
        if (ticket == null)
        {
            _context.SupportTickets.Add(new SupportTicket { UserId = userId, Status = "Open", LastUpdatedAt = DateTime.UtcNow });
        }
        else
        {
            ticket.LastUpdatedAt = DateTime.UtcNow;
            if (ticket.Status == "Resolved")
            {
                ticket.Status = "Open";
                await _hubContext.Clients.Group(userId.ToString()).SendAsync("TicketStatusChanged", "Open");
            }
        }
    }

    [HttpGet("ticket-status")]
    public async Task<ActionResult> GetTicketStatus()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.UserId == userId);
        return Ok(new { status = ticket?.Status ?? "Open" });
    }

    [HttpPost("upload-attachment")]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file was uploaded.");
        if (file.Length > 15 * 1024 * 1024) return BadRequest("File size exceeds 15MB limit.");

        var isImage = file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        await using var stream = file.OpenReadStream();

        string secureUrl;

        if (isImage)
        {
            var uploadParams = new ImageUploadParams { File = new FileDescription(file.FileName, stream), Folder = "vsense/support_attachments" };
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            if (uploadResult.Error != null) return StatusCode(500, uploadResult.Error.Message);
            secureUrl = uploadResult.SecureUrl.AbsoluteUri;
        }
        else
        {
            var uploadParams = new RawUploadParams { File = new FileDescription(file.FileName, stream), Folder = "vsense/support_attachments" };
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            if (uploadResult.Error != null) return StatusCode(500, uploadResult.Error.Message);
            secureUrl = uploadResult.SecureUrl.AbsoluteUri;
        }

        return Ok(new { url = secureUrl, fileName = file.FileName });
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var count = await _context.SupportMessages
            .CountAsync(m => m.UserId == userId && m.SenderType == "Admin" && !m.IsReadByClient);

        return Ok(new { count });
    }

    [HttpGet("my-messages")]
    public async Task<ActionResult<IEnumerable<SupportMessageResponseDto>>> GetMyMessages([FromQuery] int skip = 0, [FromQuery] int take = 30)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var unreadAdminMsgs = await _context.SupportMessages
            .Where(m => m.UserId == userId && m.SenderType == "Admin" && !m.IsReadByClient)
            .ToListAsync();

        if (unreadAdminMsgs.Any())
        {
            unreadAdminMsgs.ForEach(m => m.IsReadByClient = true);
            await _context.SaveChangesAsync();
        }

        // 1. Fetch newest messages first (so pagination grabs the most recent 30)
        var messages = await _context.SupportMessages
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(m => new SupportMessageResponseDto(
                m.Id, m.UserId, m.SenderType, m.SenderId, m.Message, m.AttachmentUrl, m.IsReadByAdmin, m.IsReadByClient, m.CreatedAt
            ))
            .ToListAsync();

        // 2. Flip the array back to chronological order so your Flutter app renders Newest at the bottom
        messages.Reverse();

        if (!messages.Any() && skip == 0)
        {
            var welcomeMsg = new SupportMessage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SenderType = "Admin",
                Message = "Hello! Welcome to V-Sense Support. How can we help you today?",
                IsReadByAdmin = true,
                IsReadByClient = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.SupportMessages.Add(welcomeMsg);
            await EnsureTicketExists(userId);
            await _context.SaveChangesAsync();

            messages.Add(new SupportMessageResponseDto(welcomeMsg.Id, welcomeMsg.UserId, welcomeMsg.SenderType, welcomeMsg.SenderId, welcomeMsg.Message, welcomeMsg.AttachmentUrl, welcomeMsg.IsReadByAdmin, welcomeMsg.IsReadByClient, welcomeMsg.CreatedAt));
        }

        return Ok(messages);
    }

    [HttpPost("send")]
    public async Task<ActionResult<SupportMessageResponseDto>> SendMessage([FromBody] SendSupportMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message) && string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest("A message or an attachment is required.");

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        await EnsureTicketExists(userId);

        var msg = new SupportMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SenderType = "Client",
            SenderId = userId,
            Message = dto.Message?.Trim() ?? string.Empty,
            AttachmentUrl = dto.AttachmentUrl,
            IsReadByAdmin = false,
            IsReadByClient = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupportMessages.Add(msg);

        var sriLankaTime = DateTime.UtcNow.AddHours(5.5);
        SupportMessage? autoReply = null;
        if (sriLankaTime.Hour < 9 || sriLankaTime.Hour >= 18)
        {
            autoReply = new SupportMessage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                SenderType = "Admin",
                Message = "Automated Reply: Our agents are offline (Hours: 9 AM - 6 PM LK Time). We received your message and will review it when we return.",
                IsReadByAdmin = true,
                IsReadByClient = false,
                CreatedAt = DateTime.UtcNow.AddSeconds(1)
            };
            _context.SupportMessages.Add(autoReply);
        }

        await _context.SaveChangesAsync();

        var responseDto = new SupportMessageResponseDto(msg.Id, msg.UserId, msg.SenderType, msg.SenderId, msg.Message, msg.AttachmentUrl, msg.IsReadByAdmin, msg.IsReadByClient, msg.CreatedAt);

        await _hubContext.Clients.Group(userId.ToString()).SendAsync("ReceiveMessage", responseDto);
        if (autoReply != null)
        {
            var autoReplyDto = new SupportMessageResponseDto(autoReply.Id, autoReply.UserId, autoReply.SenderType, autoReply.SenderId, autoReply.Message, autoReply.AttachmentUrl, autoReply.IsReadByAdmin, autoReply.IsReadByClient, autoReply.CreatedAt);
            await _hubContext.Clients.Group(userId.ToString()).SendAsync("ReceiveMessage", autoReplyDto);
        }
        await _hubContext.Clients.All.SendAsync("ConversationUpdated");

        return Ok(responseDto);
    }

    [HttpGet("admin/conversations")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<ActionResult<IEnumerable<SupportConversationSummaryDto>>> GetAdminConversations()
    {
        var conversations = await _context.SupportMessages
            .Include(m => m.User)
            .GroupBy(m => m.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                LastMessageObj = g.OrderByDescending(m => m.CreatedAt).FirstOrDefault(),
                UnreadCount = g.Count(m => m.SenderType == "Client" && !m.IsReadByAdmin)
            })
            .ToListAsync();

        var result = new List<SupportConversationSummaryDto>();

        foreach (var conv in conversations.OrderByDescending(c => c.LastMessageObj?.CreatedAt))
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == conv.UserId);
            if (user == null) continue;

            var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.UserId == conv.UserId);
            var status = ticket?.Status ?? "Open";

            var summaryText = string.IsNullOrWhiteSpace(conv.LastMessageObj?.Message)
                ? (conv.LastMessageObj?.AttachmentUrl != null ? "[Attached File]" : "")
                : conv.LastMessageObj.Message;

            result.Add(new SupportConversationSummaryDto(
                user.Id, user.FullName ?? "Customer", user.Email ?? "", user.PhoneNumber ?? "N/A", user.NIC ?? "N/A",
                summaryText, conv.LastMessageObj?.CreatedAt ?? DateTime.UtcNow, conv.UnreadCount, status
            ));
        }

        return Ok(result);
    }

    [HttpGet("admin/conversation/{userId:guid}")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<ActionResult<IEnumerable<SupportMessageResponseDto>>> GetConversationForAdmin(Guid userId)
    {
        var unread = await _context.SupportMessages.Where(m => m.UserId == userId && m.SenderType == "Client" && !m.IsReadByAdmin).ToListAsync();
        if (unread.Any())
        {
            unread.ForEach(m => m.IsReadByAdmin = true);
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("ConversationUpdated");
        }

        var messages = await _context.SupportMessages
            .Where(m => m.UserId == userId).OrderBy(m => m.CreatedAt)
            .Select(m => new SupportMessageResponseDto(m.Id, m.UserId, m.SenderType, m.SenderId, m.Message, m.AttachmentUrl, m.IsReadByAdmin, m.IsReadByClient, m.CreatedAt))
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost("admin/reply")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<ActionResult<SupportMessageResponseDto>> ReplyToCustomer([FromBody] AdminReplyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message) && string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest("A message or an attachment is required.");

        var adminId = GetCurrentUserId();
        await EnsureTicketExists(dto.UserId);

        var msg = new SupportMessage
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            SenderType = "Admin",
            SenderId = adminId == Guid.Empty ? null : adminId,
            Message = dto.Message?.Trim() ?? string.Empty,
            AttachmentUrl = dto.AttachmentUrl,
            IsReadByAdmin = true,
            IsReadByClient = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.SupportMessages.Add(msg);

        var supportNotification = new Notification
        {
            Id = Guid.NewGuid(),
            Title = "Support Update",
            Message = string.IsNullOrWhiteSpace(dto.Message)
                ? "An admin attached a file to your support inquiry."
                : (dto.Message.Length > 80 ? dto.Message.Substring(0, 77) + "..." : dto.Message),
            Category = "System",
            IsBroadcast = false,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = adminId == Guid.Empty ? null : adminId
        };

        var userNotification = new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            NotificationId = supportNotification.Id,
            IsRead = false
        };

        _context.Notifications.Add(supportNotification);
        _context.UserNotifications.Add(userNotification);

        await _context.SaveChangesAsync();

        var responseDto = new SupportMessageResponseDto(msg.Id, msg.UserId, msg.SenderType, msg.SenderId, msg.Message, msg.AttachmentUrl, msg.IsReadByAdmin, msg.IsReadByClient, msg.CreatedAt);

        await _hubContext.Clients.Group(dto.UserId.ToString()).SendAsync("ReceiveMessage", responseDto);
        await _hubContext.Clients.All.SendAsync("ConversationUpdated");

        return Ok(responseDto);
    }

    [HttpPost("admin/ticket-status/{userId:guid}")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<IActionResult> ToggleTicketStatus(Guid userId, [FromBody] string status)
    {
        var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.UserId == userId);
        if (ticket == null)
        {
            ticket = new SupportTicket { UserId = userId, Status = status, LastUpdatedAt = DateTime.UtcNow };
            _context.SupportTickets.Add(ticket);
        }
        else
        {
            ticket.Status = status;
            ticket.LastUpdatedAt = DateTime.UtcNow;
        }

        if (status == "Resolved")
        {
            var adminId = GetCurrentUserId();
            var resolvedNotification = new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Ticket Resolved",
                Message = "Your support ticket has been marked as resolved. Reply if you need further assistance.",
                Category = "System",
                IsBroadcast = false,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = adminId == Guid.Empty ? null : adminId
            };

            var resolvedUserNotification = new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                NotificationId = resolvedNotification.Id,
                IsRead = false
            };

            _context.Notifications.Add(resolvedNotification);
            _context.UserNotifications.Add(resolvedUserNotification);
        }

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("ConversationUpdated");
        await _hubContext.Clients.Group(userId.ToString()).SendAsync("TicketStatusChanged", ticket.Status);

        return Ok(new { status = ticket.Status });
    }
}