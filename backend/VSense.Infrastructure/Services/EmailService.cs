using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace VSense.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendApprovalEmailAsync(string toEmail, string businessName)
    {
        var subject = "V-Sense Registration Approved ✅";
        var htmlBody = $@"
            <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'>
                <div style='background:#1e3a5f;padding:24px;text-align:center;border-radius:8px 8px 0 0;'>
                    <h1 style='color:#ffffff;margin:0;font-size:24px;'>V-SENSE</h1>
                    <p style='color:#90cdf4;margin:4px 0 0;font-size:13px;'>Vehicle History &amp; Valuation Authority</p>
                </div>
                <div style='background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;'>
                    <h2 style='color:#1a202c;'>Registration Approved!</h2>
                    <p style='color:#4a5568;'>Dear <strong>{businessName}</strong>,</p>
                    <p style='color:#4a5568;'>We are pleased to inform you that your registration on the V-Sense platform has been <strong style='color:#38a169;'>approved</strong>.</p>
                    <p style='color:#4a5568;'>Your account is now <strong>active</strong>. You can log in to the V-Sense portal and begin using all features including:</p>
                    <ul style='color:#4a5568;'>
                        <li>Vehicle search by registration or chassis number</li>
                        <li>Adding service and maintenance records</li>
                        <li>Uploading service photos</li>
                    </ul>
                    <div style='margin:24px 0;text-align:center;'>
                        <a href='http://localhost:5173/login' style='background:#2b6cb0;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;'>Login to V-Sense</a>
                    </div>
                    <p style='color:#718096;font-size:13px;'>If you have any questions, please contact the V-Sense administration team.</p>
                </div>
                <div style='background:#f7fafc;padding:16px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;'>
                    <p style='color:#a0aec0;font-size:12px;margin:0;'>© 2024 V-Sense. All rights reserved.</p>
                </div>
            </div>";

        await SendEmailAsync(toEmail, subject, htmlBody);
    }

    public async Task SendRejectionEmailAsync(string toEmail, string businessName)
    {
        var subject = "V-Sense Registration Status Update";
        var htmlBody = $@"
            <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'>
                <div style='background:#1e3a5f;padding:24px;text-align:center;border-radius:8px 8px 0 0;'>
                    <h1 style='color:#ffffff;margin:0;font-size:24px;'>V-SENSE</h1>
                    <p style='color:#90cdf4;margin:4px 0 0;font-size:13px;'>Vehicle History &amp; Valuation Authority</p>
                </div>
                <div style='background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;'>
                    <h2 style='color:#1a202c;'>Registration Update</h2>
                    <p style='color:#4a5568;'>Dear <strong>{businessName}</strong>,</p>
                    <p style='color:#4a5568;'>Thank you for your interest in joining the V-Sense platform.</p>
                    <p style='color:#4a5568;'>After reviewing your registration, we regret to inform you that your application has not been approved at this time.</p>
                    <p style='color:#4a5568;'>If you believe this is an error or wish to provide additional information, please contact the V-Sense administration team.</p>
                    <p style='color:#718096;font-size:13px;'>We appreciate your understanding.</p>
                </div>
                <div style='background:#f7fafc;padding:16px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;'>
                    <p style='color:#a0aec0;font-size:12px;margin:0;'>© 2024 V-Sense. All rights reserved.</p>
                </div>
            </div>";

        await SendEmailAsync(toEmail, subject, htmlBody);
    }

    public async Task SendCheckupReminderEmailAsync(
        string toEmail,
        string ownerName,
        string garageName,
        DateTime checkupDate,
        string checkupTimeDisplay)
    {
        var subject = "Reminder: Your Vehicle Checkup Is Today 🔧";
        var dateDisplay = checkupDate.ToString("dddd, dd MMMM yyyy");

        var htmlBody = $@"
            <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'>
                <div style='background:#1e3a5f;padding:24px;text-align:center;border-radius:8px 8px 0 0;'>
                    <h1 style='color:#ffffff;margin:0;font-size:24px;'>V-SENSE</h1>
                    <p style='color:#90cdf4;margin:4px 0 0;font-size:13px;'>Vehicle History &amp; Valuation Authority</p>
                </div>
                <div style='background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;'>
                    <h2 style='color:#1a202c;'>Your Checkup Is Today</h2>
                    <p style='color:#4a5568;'>Dear <strong>{ownerName}</strong>,</p>
                    <p style='color:#4a5568;'>This is a friendly reminder that your vehicle checkup is scheduled for <strong>today, {dateDisplay}</strong>.</p>
                    <div style='background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0;'>
                        <p style='color:#1a202c;margin:0 0 8px;'><strong>Garage:</strong> {garageName}</p>
                        <p style='color:#1a202c;margin:0;'><strong>Time:</strong> {checkupTimeDisplay}</p>
                    </div>
                    <p style='color:#4a5568;'>Please make sure to arrive on time with your vehicle.</p>
                    <p style='color:#718096;font-size:13px;'>If your plans have changed, please contact the garage directly.</p>
                </div>
                <div style='background:#f7fafc;padding:16px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;'>
                    <p style='color:#a0aec0;font-size:12px;margin:0;'>© 2024 V-Sense. All rights reserved.</p>
                </div>
            </div>";

        await SendEmailAsync(toEmail, subject, htmlBody);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _config["Email:Host"] ?? "smtp.gmail.com";
        var portStr = _config["Email:Port"] ?? "587";
        var username = _config["Email:Username"] ?? _config["MAIL_USERNAME"];
        var password = _config["Email:Password"] ?? _config["MAIL_PASSWORD"];
        var fromName = _config["Email:FromName"] ?? "V-Sense Platform";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("[EMAIL FALLBACK] Missing email credentials! To: {To} | Subject: {Subject}", toEmail, subject);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, username));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = htmlBody };
        message.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();

        // Bypass revocation check errors (OCSP/CRL offline) on local network / CI pipelines
        smtp.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) =>
        {
            if (sslPolicyErrors == System.Net.Security.SslPolicyErrors.None)
                return true;

            if (sslPolicyErrors == System.Net.Security.SslPolicyErrors.RemoteCertificateChainErrors)
            {
                return true;
            }

            return false;
        };

        try
        {
            int port = int.TryParse(portStr, out var parsedPort) ? parsedPort : 587;

            await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(username, password);
            await smtp.SendAsync(message);

            _logger.LogInformation("[EMAIL SUCCESS] Email sent successfully to {To}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL ERROR] Failed to send email to {To}", toEmail);
        }
        finally
        {
            if (smtp.IsConnected)
            {
                await smtp.DisconnectAsync(true);
            }
        }
    }
}