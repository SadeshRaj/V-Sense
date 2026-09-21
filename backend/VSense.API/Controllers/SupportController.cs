using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VSense.Application.Common;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupportController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly Cloudinary _cloudinary;

    public SupportController(ApplicationDbContext context, IOptions<CloudinarySettings> cloudinaryOptions)
    {
        _context = context;
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

    // UPLOAD ATTACHMENT (Images, PDF, Documents) to Cloudinary
    [HttpPost("upload-attachment")]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file was uploaded.");

        if (file.Length > 15 * 1024 * 1024) // 15MB limit
            return BadRequest("File size exceeds 15MB limit.");

        var isImage = file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        await using var stream = file.OpenReadStream();

        string secureUrl;

        if (isImage)
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "vsense/support_attachments"
            };
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            if (uploadResult.Error != null)
                return StatusCode(500, uploadResult.Error.Message);

            secureUrl = uploadResult.SecureUrl.AbsoluteUri;
        }
        else
        {
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "vsense/support_attachments"
            };
            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            if (uploadResult.Error != null)
                return StatusCode(500, uploadResult.Error.Message);

            secureUrl = uploadResult.SecureUrl.AbsoluteUri;
        }

        return Ok(new { url = secureUrl, fileName = file.FileName });
    }

    // CLIENT: Get chat history
    [HttpGet("my-messages")]
    public async Task<ActionResult<IEnumerable<SupportMessageResponseDto>>> GetMyMessages()
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

        var messages = await _context.SupportMessages
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportMessageResponseDto(
                m.Id, m.UserId, m.SenderType, m.SenderId, m.Message, m.AttachmentUrl, m.IsReadByAdmin, m.IsReadByClient, m.CreatedAt
            ))
            .ToListAsync();

        return Ok(messages);
    }

    // CLIENT: Send message with optional attachment
    [HttpPost("send")]
    public async Task<ActionResult<SupportMessageResponseDto>> SendMessage([FromBody] SendSupportMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message) && string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest("A message or an attachment is required.");

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

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
        await _context.SaveChangesAsync();

        return Ok(new SupportMessageResponseDto(
            msg.Id, msg.UserId, msg.SenderType, msg.SenderId, msg.Message, msg.AttachmentUrl, msg.IsReadByAdmin, msg.IsReadByClient, msg.CreatedAt
        ));
    }

    // ADMIN: List conversations
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

            var summaryText = string.IsNullOrWhiteSpace(conv.LastMessageObj?.Message)
                ? (conv.LastMessageObj?.AttachmentUrl != null ? "[Attached File]" : "")
                : conv.LastMessageObj.Message;

            result.Add(new SupportConversationSummaryDto(
                user.Id,
                user.FullName ?? "Customer",
                user.Email ?? "",
                user.PhoneNumber ?? "N/A",
                user.NIC ?? "N/A",
                summaryText,
                conv.LastMessageObj?.CreatedAt ?? DateTime.UtcNow,
                conv.UnreadCount
            ));
        }

        return Ok(result);
    }

    // ADMIN: Get customer messages
    [HttpGet("admin/conversation/{userId:guid}")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<ActionResult<IEnumerable<SupportMessageResponseDto>>> GetConversationForAdmin(Guid userId)
    {
        var unread = await _context.SupportMessages
            .Where(m => m.UserId == userId && m.SenderType == "Client" && !m.IsReadByAdmin)
            .ToListAsync();

        if (unread.Any())
        {
            unread.ForEach(m => m.IsReadByAdmin = true);
            await _context.SaveChangesAsync();
        }

        var messages = await _context.SupportMessages
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new SupportMessageResponseDto(
                m.Id, m.UserId, m.SenderType, m.SenderId, m.Message, m.AttachmentUrl, m.IsReadByAdmin, m.IsReadByClient, m.CreatedAt
            ))
            .ToListAsync();

        return Ok(messages);
    }

    // ADMIN: Reply with optional attachment
    [HttpPost("admin/reply")]
    [Authorize(Roles = "Admin,Administrator")]
    public async Task<ActionResult<SupportMessageResponseDto>> ReplyToCustomer([FromBody] AdminReplyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message) && string.IsNullOrWhiteSpace(dto.AttachmentUrl))
            return BadRequest("A message or an attachment is required.");

        var adminId = GetCurrentUserId();

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
        await _context.SaveChangesAsync();

        return Ok(new SupportMessageResponseDto(
            msg.Id, msg.UserId, msg.SenderType, msg.SenderId, msg.Message, msg.AttachmentUrl, msg.IsReadByAdmin, msg.IsReadByClient, msg.CreatedAt
        ));
    }
}