using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using Xunit;

namespace VSense.Tests.Controllers;

public class PaymentsControllerTests
{
    private const string TestMerchantSecret = "4ON82285121731671239108392113110291";
    private const string MerchantId = "1220000";

    private static ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static IConfiguration GetConfiguration(string? secret = TestMerchantSecret)
    {
        var inMemorySettings = new Dictionary<string, string?>();
        if (secret != null)
        {
            inMemorySettings["PayHereSettings:MerchantSecret"] = secret;
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    private static string CalculateValidSignature(
        string merchantId,
        string orderId,
        string payhereAmount,
        string payhereCurrency,
        string statusCode,
        string merchantSecret)
    {
        string ToMd5Upper(string input)
        {
            var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }

        var hashedSecret = ToMd5Upper(merchantSecret);
        var raw = $"{merchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{hashedSecret}";
        return ToMd5Upper(raw);
    }

    private static PayHereNotifyDto CreateValidDto(
        string statusCode = "2",
        string orderId = "ORDER123",
        string paymentId = "PAY12345",
        string amount = "1500.00",
        string currency = "LKR",
        Guid? vehicleId = null,
        Guid? userId = null)
    {
        var vId = (vehicleId ?? Guid.NewGuid()).ToString();
        var uId = (userId ?? Guid.NewGuid()).ToString();
        var sig = CalculateValidSignature(MerchantId, orderId, amount, currency, statusCode, TestMerchantSecret);

        return new PayHereNotifyDto
        {
            merchant_id = MerchantId,
            order_id = orderId,
            payment_id = paymentId,
            payhere_amount = amount,
            payhere_currency = currency,
            status_code = statusCode,
            md5sig = sig,
            custom_1 = vId,
            custom_2 = uId
        };
    }

    #region Security & Signature Tests

    [Fact]
    public async Task PayHereNotify_MissingMerchantSecretInConfig_Returns500InternalServerError()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration(secret: null); // Config missing key
        var controller = new PaymentsController(context, config);
        var dto = CreateValidDto();

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        var statusResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Empty(context.Payments);
    }

    [Fact]
    public async Task PayHereNotify_InvalidMd5Signature_ReturnsBadRequest()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);
        
        var dto = CreateValidDto();
        dto.md5sig = "INVALID_TAMPERED_SIGNATURE_MD5";

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<BadRequestResult>(result);
        Assert.Empty(context.Payments);
    }

    [Fact]
    public async Task PayHereNotify_SignatureCaseInsensitivity_AcceptsLowercaseSignature()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);

        var dto = CreateValidDto();
        dto.md5sig = dto.md5sig.ToLowerInvariant(); // PayHere lower/uppercase variance test

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<OkResult>(result);
        Assert.Single(context.Payments);
    }

    #endregion

    #region PayHere Status & Idempotency Tests

    [Theory]
    [InlineData("0")]  // Pending
    [InlineData("-1")] // Canceled
    [InlineData("-2")] // Failed
    [InlineData("-3")] // Chargedback
    public async Task PayHereNotify_NonSuccessStatusCode_ReturnsOkWithoutProcessing(string statusCode)
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);

        var dto = CreateValidDto(statusCode: statusCode);

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<OkResult>(result);
        Assert.Empty(context.Payments);
        Assert.Empty(context.VehicleOwnerships);
    }

    [Fact]
    public async Task PayHereNotify_DuplicatePaymentId_ReturnsOkAndPreventsReplayAttack()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var existingPaymentId = "PAY_REPLAY_TEST_01";

        context.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(),
            TrasactionId = existingPaymentId,
            UserId = Guid.NewGuid(),
            VehicleId = Guid.NewGuid(),
            Amount = 1000m,
            Status = "Completed",
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);
        var dto = CreateValidDto(paymentId: existingPaymentId);

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<OkResult>(result);
        Assert.Equal(1, await context.Payments.CountAsync());
    }

    #endregion

    #region Input Validation Tests

    [Fact]
    public async Task PayHereNotify_InvalidCustom1VehicleGuid_ReturnsBadRequest()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);

        var dto = CreateValidDto();
        dto.custom_1 = "not-a-valid-guid";

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<BadRequestResult>(result);
        Assert.Empty(context.Payments);
    }

    [Fact]
    public async Task PayHereNotify_InvalidCustom2UserGuid_ReturnsBadRequest()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);

        var dto = CreateValidDto();
        dto.custom_2 = "not-a-valid-guid";

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<BadRequestResult>(result);
        Assert.Empty(context.Payments);
    }

    #endregion

    #region Business Logic & Database State Tests

    [Fact]
    public async Task PayHereNotify_ValidNewOwnership_CreatesPaymentAndNewActiveOwnership()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);

        var vehicleId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var dto = CreateValidDto(
            paymentId: "PAY_UNIQUE_999",
            amount: "2500.50",
            vehicleId: vehicleId,
            userId: userId
        );

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<OkResult>(result);

        var payment = await context.Payments.FirstOrDefaultAsync(p => p.TrasactionId == "PAY_UNIQUE_999");
        Assert.NotNull(payment);
        Assert.Equal(userId, payment.UserId);
        Assert.Equal(vehicleId, payment.VehicleId);
        Assert.Equal(2500.50m, payment.Amount);
        Assert.Equal("Completed", payment.Status);

        var ownership = await context.VehicleOwnerships
            .FirstOrDefaultAsync(o => o.VehicleId == vehicleId && o.UserId == userId);
        Assert.NotNull(ownership);
        Assert.Equal("Active", ownership.Status);
        Assert.Equal(payment.Id, ownership.PaymentId);
        Assert.NotNull(ownership.VerifiedAt);
    }

    [Fact]
    public async Task PayHereNotify_ExistingPendingOwnership_UpdatesOwnershipToActive()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var vehicleId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var existingOwnership = new VehicleOwnership
        {
            Id = Guid.NewGuid(),
            VehicleId = vehicleId,
            UserId = userId,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        context.VehicleOwnerships.Add(existingOwnership);
        await context.SaveChangesAsync();

        var config = GetConfiguration();
        var controller = new PaymentsController(context, config);
        var dto = CreateValidDto(
            paymentId: "PAY_EXISTING_OWNERSHIP_123",
            vehicleId: vehicleId,
            userId: userId
        );

        // Act
        var result = await controller.PayHereNotify(dto);

        // Assert
        Assert.IsType<OkResult>(result);

        var payment = await context.Payments.SingleAsync();
        Assert.Equal("PAY_EXISTING_OWNERSHIP_123", payment.TrasactionId);

        var ownerships = await context.VehicleOwnerships.ToListAsync();
        Assert.Single(ownerships); // Must update existing record, not create duplicate

        var updatedOwnership = ownerships.First();
        Assert.Equal("Active", updatedOwnership.Status);
        Assert.Equal(payment.Id, updatedOwnership.PaymentId);
        Assert.NotNull(updatedOwnership.VerifiedAt);
    }

    #endregion
}