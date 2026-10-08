// VSense.Tests/Database/VehicleOwnershipDatabaseTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class VehicleOwnershipDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public VehicleOwnershipDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    // ---------- Local builders / helpers ----------

    private static VehicleOwnership NewOwnership(
        Guid? userId = null,
        Guid? vehicleId = null,
        Guid? paymentId = null,
        string? status = "Verified") => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        VehicleId = vehicleId,
        PaymentId = paymentId,
        Status = status,
        VerifiedAt = DateTime.UtcNow,
        CreatedAt = DateTime.UtcNow
    };

    private static void AssertSameInstant(DateTime? expected, DateTime? actual)
    {
        Assert.NotNull(expected);
        Assert.NotNull(actual);
        Assert.True((expected!.Value - actual!.Value).Duration() < TimeSpan.FromSeconds(1),
            $"Expected {expected:O} but got {actual:O}");
    }

    // ---------- Create / Read ----------

    [Fact]
    public async Task Insert_WithAllFields_PersistsAndReadsBack()
    {
        var user = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        var payment = DbTestData.NewPayment(user.Id, vehicle.Id);
        var ownership = NewOwnership(user.Id, vehicle.Id, payment.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, vehicle, payment, ownership);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>().AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.Equal(user.Id, saved.UserId);
        Assert.Equal(vehicle.Id, saved.VehicleId);
        Assert.Equal(payment.Id, saved.PaymentId);
        Assert.Equal("Verified", saved.Status);
        AssertSameInstant(ownership.VerifiedAt, saved.VerifiedAt);
        AssertSameInstant(ownership.CreatedAt, saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_WithOnlyId_Succeeds()
    {
        var ownership = new VehicleOwnership { Id = Guid.NewGuid() };

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, ownership);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>().AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.Null(saved.UserId);
        Assert.Null(saved.VehicleId);
        Assert.Null(saved.PaymentId);
        Assert.Null(saved.Status);
        Assert.Null(saved.VerifiedAt);
        Assert.Null(saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_DuplicatePrimaryKey_ThrowsUniqueViolation()
    {
        var ownership = NewOwnership();
        await using (var first = _fixture.CreateContext())
            await DbTestData.SaveAsync(first, ownership);

        var duplicate = NewOwnership();
        duplicate.Id = ownership.Id;

        await using var ctx = _fixture.CreateContext();
        ctx.Add(duplicate);

        // 23505 = unique_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23505");
    }

    // ---------- Relationships ----------

    [Fact]
    public async Task Include_User_Vehicle_Payment_LoadsAllNavigations()
    {
        var user = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        var payment = DbTestData.NewPayment(user.Id, vehicle.Id);
        var ownership = NewOwnership(user.Id, vehicle.Id, payment.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, vehicle, payment, ownership);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>()
            .Include(o => o.User)
            .Include(o => o.Vehicle)
            .Include(o => o.Payment)
            .AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.NotNull(saved.User);
        Assert.NotNull(saved.Vehicle);
        Assert.NotNull(saved.Payment);
        Assert.Equal(user.Id, saved.User!.Id);
        Assert.Equal(vehicle.Id, saved.Vehicle!.Id);
        Assert.Equal(payment.Id, saved.Payment!.Id);
        Assert.Equal(payment.TrasactionId, saved.Payment.TrasactionId);
    }

    [Fact]
    public async Task Include_WithNoRelations_NavigationsAreNull()
    {
        var ownership = NewOwnership();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, ownership);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>()
            .Include(o => o.User)
            .Include(o => o.Vehicle)
            .Include(o => o.Payment)
            .AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.Null(saved.User);
        Assert.Null(saved.Vehicle);
        Assert.Null(saved.Payment);
    }

    [Fact]
    public async Task Insert_WithNonExistentUser_ThrowsForeignKeyViolation()
    {
        var ownership = NewOwnership(userId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(ownership);

        // 23503 = foreign_key_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Insert_WithNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var ownership = NewOwnership(vehicleId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(ownership);

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Insert_WithNonExistentPayment_ThrowsForeignKeyViolation()
    {
        var ownership = NewOwnership(paymentId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(ownership);

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Update_ToNonExistentPayment_ThrowsForeignKeyViolation()
    {
        var ownership = NewOwnership();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, ownership);

        await using var ctx = _fixture.CreateContext();
        var tracked = await ctx.Set<VehicleOwnership>().FirstAsync(o => o.Id == ownership.Id);
        tracked.PaymentId = Guid.NewGuid();

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Vehicle_CanHaveMultipleOwnerships_AcrossDifferentUsers()
    {
        var user1 = DbTestData.NewUser();
        var user2 = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user1, user2, vehicle,
                NewOwnership(user1.Id, vehicle.Id, status: "Transferred"),
                NewOwnership(user2.Id, vehicle.Id, status: "Verified"));

        await using var read = _fixture.CreateContext();
        var owners = await read.Set<VehicleOwnership>().AsNoTracking()
            .Where(o => o.VehicleId == vehicle.Id)
            .Select(o => o.UserId)
            .ToListAsync();

        Assert.Equal(2, owners.Count);
        Assert.Contains(user1.Id, owners);
        Assert.Contains(user2.Id, owners);
    }

    [Fact]
    public async Task User_CanOwnMultipleVehicles()
    {
        var user = DbTestData.NewUser();
        var v1 = DbTestData.NewVehicle();
        var v2 = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, v1, v2,
                NewOwnership(user.Id, v1.Id),
                NewOwnership(user.Id, v2.Id));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<VehicleOwnership>().CountAsync(o => o.UserId == user.Id);

        Assert.Equal(2, count);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_StatusAndVerifiedAt_Persists()
    {
        var ownership = NewOwnership(status: "Pending");
        ownership.VerifiedAt = null;
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, ownership);

        var verifiedAt = DateTime.UtcNow;

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehicleOwnership>().FirstAsync(o => o.Id == ownership.Id);
            tracked.Status = "Verified";
            tracked.VerifiedAt = verifiedAt;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>().AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.Equal("Verified", saved.Status);
        AssertSameInstant(verifiedAt, saved.VerifiedAt);
    }

    [Fact]
    public async Task Update_AttachPaymentToExistingOwnership_Persists()
    {
        var ownership = NewOwnership();
        var payment = DbTestData.NewPayment();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment, ownership);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehicleOwnership>().FirstAsync(o => o.Id == ownership.Id);
            tracked.PaymentId = payment.Id;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleOwnership>()
            .Include(o => o.Payment)
            .AsNoTracking()
            .FirstAsync(o => o.Id == ownership.Id);

        Assert.Equal(payment.Id, saved.PaymentId);
        Assert.NotNull(saved.Payment);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_RemovesOwnership()
    {
        var ownership = NewOwnership();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, ownership);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehicleOwnership>().FirstAsync(o => o.Id == ownership.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.False(await read.Set<VehicleOwnership>().AnyAsync(o => o.Id == ownership.Id));
    }

    [Fact]
    public async Task Delete_Ownership_DoesNotDeleteUserVehicleOrPayment()
    {
        var user = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        var payment = DbTestData.NewPayment(user.Id, vehicle.Id);
        var ownership = NewOwnership(user.Id, vehicle.Id, payment.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, vehicle, payment, ownership);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehicleOwnership>().FirstAsync(o => o.Id == ownership.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.True(await read.Users.AnyAsync(u => u.Id == user.Id));
        Assert.True(await read.Vehicles.AnyAsync(v => v.Id == vehicle.Id));
        Assert.True(await read.Payments.AnyAsync(p => p.Id == payment.Id));
    }

    // ---------- Queries ----------
    // The container is shared across the collection, so every query is
    // scoped to a freshly created vehicle or user.

    [Fact]
    public async Task Query_CurrentOwnerOfVehicle_ReturnsVerifiedOwnership()
    {
        var oldOwner = DbTestData.NewUser();
        var newOwner = DbTestData.NewUser();
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, oldOwner, newOwner, vehicle,
                NewOwnership(oldOwner.Id, vehicle.Id, status: "Transferred"),
                NewOwnership(newOwner.Id, vehicle.Id, status: "Verified"));

        await using var read = _fixture.CreateContext();
        var current = await read.Set<VehicleOwnership>()
            .Include(o => o.User)
            .AsNoTracking()
            .SingleAsync(o => o.VehicleId == vehicle.Id && o.Status == "Verified");

        Assert.Equal(newOwner.Id, current.UserId);
        Assert.Equal(newOwner.Email, current.User!.Email);
    }

    [Fact]
    public async Task Query_PendingVerification_ReturnsOnlyUnverified()
    {
        var user = DbTestData.NewUser();
        var v1 = DbTestData.NewVehicle();
        var v2 = DbTestData.NewVehicle();

        var pending = NewOwnership(user.Id, v1.Id, status: "Pending");
        pending.VerifiedAt = null;
        var verified = NewOwnership(user.Id, v2.Id, status: "Verified");

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, v1, v2, pending, verified);

        await using var read = _fixture.CreateContext();
        var result = await read.Set<VehicleOwnership>().AsNoTracking()
            .Where(o => o.UserId == user.Id && o.VerifiedAt == null)
            .ToListAsync();

        Assert.Single(result);
        Assert.Equal(pending.Id, result[0].Id);
    }

    [Fact]
    public async Task Query_OwnershipsForUser_OrderedByCreatedAtDescending()
    {
        var user = DbTestData.NewUser();
        var v1 = DbTestData.NewVehicle();
        var v2 = DbTestData.NewVehicle();

        var older = NewOwnership(user.Id, v1.Id);
        older.CreatedAt = DateTime.UtcNow.AddDays(-5);
        var newer = NewOwnership(user.Id, v2.Id);
        newer.CreatedAt = DateTime.UtcNow;

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, user, v1, v2, older, newer);

        await using var read = _fixture.CreateContext();
        var ordered = await read.Set<VehicleOwnership>().AsNoTracking()
            .Where(o => o.UserId == user.Id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, ordered.Count);
        Assert.Equal(newer.Id, ordered[0].Id);
        Assert.Equal(older.Id, ordered[1].Id);
    }

    [Fact]
    public async Task Query_ByPayment_FindsOwnershipLinkedToPayment()
    {
        var payment = DbTestData.NewPayment();
        var ownership = NewOwnership(paymentId: payment.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, payment, ownership);

        await using var read = _fixture.CreateContext();
        var found = await read.Set<VehicleOwnership>().AsNoTracking()
            .SingleAsync(o => o.PaymentId == payment.Id);

        Assert.Equal(ownership.Id, found.Id);
    }
}