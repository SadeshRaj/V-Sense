namespace VSense.Infrastructure.Services;

public interface IEmailService
{
    Task SendApprovalEmailAsync(string toEmail, string businessName);
    Task SendRejectionEmailAsync(string toEmail, string businessName);
}
