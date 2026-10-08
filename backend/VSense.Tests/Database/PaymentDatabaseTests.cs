// VSense.Tests/Database/PaymentDatabaseTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class PaymentDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public PaymentDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    // ---------- Create / Read ----------

    [Fact]
    public async Task Insert_WithAllFields_PersistsAndReadsBack()
    {
        var user = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        await using (var setup = _fixture.CreateContext())
            await DbTestData.SaveAsync(setup, user, vehicle);

        var payment = DbTestData.NewPayment(user.Id, vehicle.Id);
        payment.Amount = 2500.50m;
        payment.Status = "Completed";

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);

        Assert.Equal(user.Id, saved.UserId);
        Assert.Equal(vehicle.Id, saved.VehicleId);
        Assert.Equal(payment.TrasactionId, saved.TrasactionId);
        Assert.Equal(2500.50m, saved.Amount);
        Assert.Equal("Completed", saved.Status);
        Assert.NotNull(saved.PaidAt);
        Assert.NotNull(saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_WithOnlyRequiredFields_Succeeds()
    {
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            TrasactionId = $"TX_{Guid.NewGuid():N}"
        };

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);

        Assert.Null(saved.UserId);
        Assert.Null(saved.VehicleId);
        Assert.Null(saved.Amount);
        Assert.Null(saved.Status);
        Assert.Null(saved.PaidAt);
        Assert.Null(saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_WithNullTransactionId_ThrowsNotNullViolation()
    {
        var payment = DbTestData.NewPayment();
        payment.TrasactionId = null!;

        await using var ctx = _fixture.CreateContext();
        ctx.Payments.Add(payment);

        // 23502 = not_null_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23502");
    }

    [Fact]
    public async Task Insert_DuplicatePrimaryKey_ThrowsUniqueViolation()
    {
        var payment = DbTestData.NewPayment();
        await using (var first = _fixture.CreateContext())
            await DbTestData.SaveAsync(first, payment);

        var duplicate = DbTestData.NewPayment();
        duplicate.Id = payment.Id;

        await using var ctx = _fixture.CreateContext();
        ctx.Payments.Add(duplicate);

        // 23505 = unique_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23505");
    }

    [Theory]
    [InlineData("0.01")]
    [InlineData("100.00")]
    [InlineData("99999.99")]
    [InlineData("1234567.89")]
    public async Task Amount_DecimalValue_IsPreserved(string amountText)
    {
        var amount = decimal.Parse(amountText, System.Globalization.CultureInfo.InvariantCulture);
        var payment = DbTestData.NewPayment();
        payment.Amount = amount;

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);

        Assert.Equal(amount, saved.Amount);
    }

    // ---------- Relationships ----------

    [Fact]
    public async Task Include_User_LoadsNavigationProperty()
    {
        var user = DbTestData.NewUser();
        var payment = DbTestData.NewPayment(userId: user.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments
            .Include(p => p.User)
            .AsNoTracking()
            .FirstAsync(p => p.Id == payment.Id);

        Assert.NotNull(saved.User);
        Assert.Equal(user.Id, saved.User!.Id);
        Assert.Equal(user.Email, saved.User.Email);
    }

    [Fact]
    public async Task Include_Vehicle_LoadsNavigationProperty()
    {
        var vehicle = DbTestData.NewVehicle();
        var payment = DbTestData.NewPayment(vehicleId: vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments
            .Include(p => p.Vehicle)
            .AsNoTracking()
            .FirstAsync(p => p.Id == payment.Id);

        Assert.NotNull(saved.Vehicle);
        Assert.Equal(vehicle.Id, saved.Vehicle!.Id);
        Assert.Equal(vehicle.RegistrationNumber, saved.Vehicle.RegistrationNumber);
    }

    [Fact]
    public async Task Include_WithNoUserOrVehicle_NavigationsAreNull()
    {
        var payment = DbTestData.NewPayment();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments
            .Include(p => p.User)
            .Include(p => p.Vehicle)
            .AsNoTracking()
            .FirstAsync(p => p.Id == payment.Id);

        Assert.Null(saved.User);
        Assert.Null(saved.Vehicle);
    }

    [Fact]
    public async Task Insert_WithNonExistentUser_ThrowsForeignKeyViolation()
    {
        var payment = DbTestData.NewPayment(userId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Payments.Add(payment);

        // 23503 = foreign_key_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Insert_WithNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var payment = DbTestData.NewPayment(vehicleId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Payments.Add(payment);

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task User_CanHaveMultiplePayments()
    {
        var user = DbTestData.NewUser();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user,
                DbTestData.NewPayment(userId: user.Id),
                DbTestData.NewPayment(userId: user.Id),
                DbTestData.NewPayment(userId: user.Id));

        await using var read = _fixture.CreateContext();
        var count = await read.Payments.CountAsync(p => p.UserId == user.Id);

        Assert.Equal(3, count);
    }

    [Fact]
    public async Task Vehicle_CanHaveMultiplePayments()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle,
                DbTestData.NewPayment(vehicleId: vehicle.Id),
                DbTestData.NewPayment(vehicleId: vehicle.Id));

        await using var read = _fixture.CreateContext();
        var count = await read.Payments.CountAsync(p => p.VehicleId == vehicle.Id);

        Assert.Equal(2, count);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_StatusAndPaidAt_Persists()
    {
        var payment = DbTestData.NewPayment();
        payment.Status = "Pending";
        payment.PaidAt = null;
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Payments.FirstAsync(p => p.Id == payment.Id);
            tracked.Status = "Completed";
            tracked.PaidAt = DateTime.UtcNow;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);

        Assert.Equal("Completed", saved.Status);
        Assert.NotNull(saved.PaidAt);
    }

    [Fact]
    public async Task Update_ClearingUserId_SetsNull()
    {
        var user = DbTestData.NewUser();
        var payment = DbTestData.NewPayment(userId: user.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, payment);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Payments.FirstAsync(p => p.Id == payment.Id);
            tracked.UserId = null;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Payments.AsNoTracking().FirstAsync(p => p.Id == payment.Id);

        Assert.Null(saved.UserId);
    }

    [Fact]
    public async Task Update_ToNonExistentUser_ThrowsForeignKeyViolation()
    {
        var payment = DbTestData.NewPayment();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using var ctx = _fixture.CreateContext();
        var tracked = await ctx.Payments.FirstAsync(p => p.Id == payment.Id);
        tracked.UserId = Guid.NewGuid();

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_RemovesPayment()
    {
        var payment = DbTestData.NewPayment();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Payments.FirstAsync(p => p.Id == payment.Id);
            delete.Payments.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.False(await read.Payments.AnyAsync(p => p.Id == payment.Id));
    }

    [Fact]
    public async Task Delete_Payment_DoesNotDeleteUserOrVehicle()
    {
        var user = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        var payment = DbTestData.NewPayment(user.Id, vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, vehicle, payment);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Payments.FirstAsync(p => p.Id == payment.Id);
            delete.Payments.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.True(await read.Users.AnyAsync(u => u.Id == user.Id));
        Assert.True(await read.Vehicles.AnyAsync(v => v.Id == vehicle.Id));
    }

    // ---------- Queries ----------
    // The container is shared by every test in the collection, so queries
    // are always scoped to a freshly created user to avoid cross-test noise.

    [Fact]
    public async Task Query_ByTransactionId_ReturnsMatchingPayment()
    {
        var target = DbTestData.NewPayment();
        var other = DbTestData.NewPayment();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, target, other);

        await using var read = _fixture.CreateContext();
        var result = await read.Payments.AsNoTracking()
            .Where(p => p.TrasactionId == target.TrasactionId)
            .ToListAsync();

        Assert.Single(result);
        Assert.Equal(target.Id, result[0].Id);
    }

    [Fact]
    public async Task Query_ByStatus_FiltersCorrectly()
    {
        var user = DbTestData.NewUser();
        var p1 = DbTestData.NewPayment(userId: user.Id); p1.Status = "Completed";
        var p2 = DbTestData.NewPayment(userId: user.Id); p2.Status = "Completed";
        var p3 = DbTestData.NewPayment(userId: user.Id); p3.Status = "Failed";
        var p4 = DbTestData.NewPayment(userId: user.Id); p4.Status = "Pending";
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, p1, p2, p3, p4);

        await using var read = _fixture.CreateContext();
        var completed = await read.Payments
            .CountAsync(p => p.UserId == user.Id && p.Status == "Completed");

        Assert.Equal(2, completed);
    }

    [Fact]
    public async Task Query_TotalPaidAmountForUser_SumsOnlyCompletedPayments()
    {
        var user = DbTestData.NewUser();
        var p1 = DbTestData.NewPayment(userId: user.Id); p1.Amount = 1000m; p1.Status = "Completed";
        var p2 = DbTestData.NewPayment(userId: user.Id); p2.Amount = 2500m; p2.Status = "Completed";
        var p3 = DbTestData.NewPayment(userId: user.Id); p3.Amount = 9999m; p3.Status = "Failed";
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, p1, p2, p3);

        await using var read = _fixture.CreateContext();
        var total = await read.Payments
            .Where(p => p.UserId == user.Id && p.Status == "Completed")
            .SumAsync(p => p.Amount ?? 0m);

        Assert.Equal(3500m, total);
    }

    [Fact]
    public async Task Query_OrderByCreatedAtDescending_ReturnsNewestFirst()
    {
        var user = DbTestData.NewUser();
        var older = DbTestData.NewPayment(userId: user.Id);
        older.CreatedAt = DateTime.UtcNow.AddDays(-2);
        var newer = DbTestData.NewPayment(userId: user.Id);
        newer.CreatedAt = DateTime.UtcNow;
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, older, newer);

        await using var read = _fixture.CreateContext();
        var ordered = await read.Payments.AsNoTracking()
            .Where(p => p.UserId == user.Id)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, ordered.Count);
        Assert.Equal(newer.Id, ordered[0].Id);
        Assert.Equal(older.Id, ordered[1].Id);
    }
}