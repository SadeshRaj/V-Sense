namespace VSense.Infrastructure.Services;

public interface IEmailService
{
    Task SendApprovalEmailAsync(string toEmail, string businessName);
    Task SendRejectionEmailAsync(string toEmail, string businessName);

    // Sent by CheckupReminderBackgroundService on the morning of a
    // Confirmed checkup, reminding the owner where and when it is.
    Task SendCheckupReminderEmailAsync(
        string toEmail,
        string ownerName,
        string garageName,
        DateTime checkupDate,
        string checkupTimeDisplay);
}