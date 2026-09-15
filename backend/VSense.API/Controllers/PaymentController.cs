using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public PaymentsController(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("payhere-notify")]
    [AllowAnonymous] // PayHere calls this directly, with no JWT
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> PayHereNotify([FromForm] PayHereNotifyDto request)
    {
        var merchantSecret = _config["PayHereSettings:MerchantSecret"];
        if (string.IsNullOrEmpty(merchantSecret))
            return StatusCode(500);

        var expectedSig = ComputeMd5Signature(
            request.MerchantId, request.OrderId, request.PayhereAmount,
            request.PayhereCurrency, request.StatusCode, merchantSecret);

        if (!string.Equals(expectedSig, request.Md5sig, StringComparison.OrdinalIgnoreCase))
        {
            // Signature mismatch — not a genuine PayHere callback. Reject silently.
            return BadRequest();
        }

        // status_code "2" = success. Other codes = pending/cancelled/failed — ack and do nothing.
        if (request.StatusCode != "2")
            return Ok();

        // Idempotency: PayHere may call notify_url more than once for the same payment.
        var alreadyProcessed = await _context.Payments
            .AnyAsync(p => p.TrasactionId == request.PaymentId);
        if (alreadyProcessed)
            return Ok();

        if (!Guid.TryParse(request.Custom1, out var vehicleId) ||
            !Guid.TryParse(request.Custom2, out var userId))
        {
            return BadRequest();
        }

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TrasactionId = request.PaymentId,
            Amount = decimal.Parse(request.PayhereAmount, CultureInfo.InvariantCulture),
            Status = "Completed",
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            VehicleId = vehicleId
        };
        _context.Payments.Add(payment);

        var ownership = await _context.VehicleOwnerships
            .FirstOrDefaultAsync(o => o.VehicleId == vehicleId && o.UserId == userId);

        if (ownership == null)
        {
            _context.VehicleOwnerships.Add(new VehicleOwnership
            {
                Id = Guid.NewGuid(),
                VehicleId = vehicleId,
                UserId = userId,
                VerifiedAt = DateTime.UtcNow,
                Status = "Active",
                PaymentId = payment.Id,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            ownership.Status = "Active";
            ownership.VerifiedAt = DateTime.UtcNow;
            ownership.PaymentId = payment.Id;
        }

        await _context.SaveChangesAsync();

        return Ok();
    }

    private static string ComputeMd5Signature(
        string merchantId, string orderId, string payhereAmount,
        string payhereCurrency, string statusCode, string merchantSecret)
    {
        var hashedSecret = ToMd5Upper(merchantSecret);
        var raw = $"{merchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{hashedSecret}";
        return ToMd5Upper(raw);
    }

    private static string ToMd5Upper(string input)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes); // Convert.ToHexString already returns uppercase
    }
}