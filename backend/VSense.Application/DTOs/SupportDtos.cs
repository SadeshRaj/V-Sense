using System.Text.Json.Serialization;

namespace VSense.Application.DTOs;

public record SendSupportMessageDto(
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("attachmentUrl")] string? AttachmentUrl = null
);

public record AdminReplyDto(
    [property: JsonPropertyName("userId")] Guid UserId,
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("attachmentUrl")] string? AttachmentUrl = null
);

public record SupportMessageResponseDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("userId")] Guid UserId,
    [property: JsonPropertyName("senderType")] string SenderType,
    [property: JsonPropertyName("senderId")] Guid? SenderId,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("attachmentUrl")] string? AttachmentUrl,
    [property: JsonPropertyName("isReadByAdmin")] bool IsReadByAdmin,
    [property: JsonPropertyName("isReadByClient")] bool IsReadByClient,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt
);

public record SupportConversationSummaryDto(
    [property: JsonPropertyName("userId")] Guid UserId,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("phoneNumber")] string PhoneNumber,
    [property: JsonPropertyName("nic")] string NIC,
    [property: JsonPropertyName("lastMessage")] string LastMessage,
    [property: JsonPropertyName("lastMessageAt")] DateTime LastMessageAt,
    [property: JsonPropertyName("unreadCount")] int UnreadCount,
    [property: JsonPropertyName("status")] string Status
);