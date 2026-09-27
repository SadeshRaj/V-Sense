using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VSense.Application.DTOs;
using VSense.Infrastructure.Persistence;

namespace VSense.Infrastructure.Services;

// Runs once at startup (so a due reminder isn't missed if the app was
// restarted mid-morning) and then every day at 08:00 Colombo time.
// Finds Confirmed checkup requests scheduled for "today" that haven't
// been reminded yet, and emails the owner.
public class CheckupReminderBackgroundService : BackgroundService
{
    private static readonly TimeSpan ColomboOffset = TimeSpan.FromHours(5.5);
    private static readonly TimeSpan DailyRunTime = TimeSpan.FromHours(8); // 08:00 local

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CheckupReminderBackgroundService> _logger;

    public CheckupReminderBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<CheckupReminderBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendDueRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CHECKUP REMINDER] Failed while processing due reminders.");
            }

            var delay = GetDelayUntilNextRun();
            _logger.LogInformation("[CHECKUP REMINDER] Next reminder sweep in {Delay}.", delay);

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                // shutting down
            }
        }
    }

    private static TimeSpan GetDelayUntilNextRun()
    {
        var nowColombo = DateTime.UtcNow + ColomboOffset;
        var nextRunColombo = nowColombo.Date + DailyRunTime;

        if (nextRunColombo <= nowColombo)
            nextRunColombo = nextRunColombo.AddDays(1);

        return nextRunColombo - nowColombo;
    }

    private async Task SendDueRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        // RequestedDate is stored as the owner's local (Colombo) calendar date
        // labeled as UTC — see CreateRequest in CheckupRequestsController.
        // So "today" for comparison purposes is today's Colombo date, taken
        // as a raw date value (no further UTC conversion).
        var todayColombo = (DateTime.UtcNow + ColomboOffset).Date;

        var dueRequests = await context.CheckupRequests
            .Include(cr => cr.Owner)
            .Include(cr => cr.Organization)
            .Where(cr => cr.Status == CheckupRequestStatus.Confirmed
                      && !cr.ReminderSent
                      && cr.RequestedDate != null
                      && cr.RequestedDate.Value.Date == todayColombo)
            .ToListAsync(ct);

        if (dueRequests.Count == 0)
        {
            _logger.LogInformation("[CHECKUP REMINDER] No reminders due for {Date}.", todayColombo.ToShortDateString());
            return;
        }

        _logger.LogInformation("[CHECKUP REMINDER] {Count} reminder(s) due for {Date}.", dueRequests.Count, todayColombo.ToShortDateString());

        foreach (var cr in dueRequests)
        {
            if (cr.Owner == null || string.IsNullOrWhiteSpace(cr.Owner.Email))
            {
                _logger.LogWarning("[CHECKUP REMINDER] Skipping request {Id} — owner or owner email missing.", cr.Id);
                continue;
            }

            var timeDisplay = cr.RequestedTime.HasValue
                ? cr.RequestedTime.Value.ToString("hh:mm tt")
                : "the scheduled time";

            try
            {
                await emailService.SendCheckupReminderEmailAsync(
                    cr.Owner.Email,
                    cr.Owner.FullName ?? "Vehicle Owner",
                    cr.Organization?.Name ?? "your garage",
                    cr.RequestedDate!.Value,
                    timeDisplay);

                cr.ReminderSent = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CHECKUP REMINDER] Failed to send reminder for request {Id}.", cr.Id);
            }
        }

        await context.SaveChangesAsync(ct);
    }
}