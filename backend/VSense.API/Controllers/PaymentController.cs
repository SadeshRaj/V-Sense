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
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> PayHereNotify([FromForm] PayHereNotifyDto request)
    {
        var merchantSecret = _config["PayHereSettings:MerchantSecret"];
        if (string.IsNullOrEmpty(merchantSecret))
            return StatusCode(500);

        var expectedSig = ComputeMd5Signature(
            request.merchant_id, request.order_id, request.payhere_amount,
            request.payhere_currency, request.status_code, merchantSecret);

        if (!string.Equals(expectedSig, request.md5sig, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest();
        }

        if (request.status_code != "2")
            return Ok();

        var alreadyProcessed = await _context.Payments
            .AnyAsync(p => p.TrasactionId == request.payment_id);
        if (alreadyProcessed)
            return Ok();

        if (!Guid.TryParse(request.custom_1, out var vehicleId) ||
            !Guid.TryParse(request.custom_2, out var userId))
        {
            return BadRequest();
        }

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TrasactionId = request.payment_id,
            Amount = decimal.Parse(request.payhere_amount, CultureInfo.InvariantCulture),
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
        return Convert.ToHexString(bytes);
    }
}