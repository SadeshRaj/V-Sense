namespace VSense.Application.DTOs;

public record SendSupportMessageDto(string? Message, string? AttachmentUrl = null);

public record AdminReplyDto(Guid UserId, string? Message, string? AttachmentUrl = null);

public record SupportMessageResponseDto(
    Guid Id,
    Guid UserId,
    string SenderType,
    Guid? SenderId,
    string Message,
    string? AttachmentUrl,
    bool IsReadByAdmin,
    bool IsReadByClient,
    DateTime CreatedAt
);

public record SupportConversationSummaryDto(
    Guid UserId,
    string FullName,
    string Email,
    string PhoneNumber,
    string NIC,
    string LastMessage,
    DateTime LastMessageAt,
    int UnreadCount,
    string Status // <--- NEW
);