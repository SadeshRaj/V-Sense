// VSense.Tests/Database/VehicleHistoryDatabaseTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class VehicleHistoryDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public VehicleHistoryDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    // ---------- Local builders / helpers ----------

    private static VehicleHistory NewHistory(Guid? vehicleId = null) => new()
    {
        VehicleId = vehicleId,
        CreatedAt = DateTime.UtcNow,
        RegistrationDate = DateTime.UtcNow.AddYears(-5),
        RevenueLicenseLastRenewalDate = DateTime.UtcNow.AddMonths(-6),
        RevenueLicenseExpiryDate = DateTime.UtcNow.AddMonths(6),
        InsuranceStatus = "Active",
        InsuranceType = "Comprehensive",
        InsuranceExpiryDate = DateTime.UtcNow.AddMonths(9),
        RegistrationStatus = "Registered",
        LastOwnershipTransferDate = DateTime.UtcNow.AddYears(-1),
        UpdatedAt = DateTime.UtcNow
    };

    private static void AssertSameInstant(DateTime? expected, DateTime? actual)
    {
        Assert.NotNull(expected);
        Assert.NotNull(actual);
        Assert.True((expected!.Value - actual!.Value).Duration() < TimeSpan.FromSeconds(1),
            $"Expected {expected:O} but got {actual:O}");
    }

    // ---------- Schema ----------

    [Fact]
    public async Task Schema_TableIsNamedVehicleHistory_WithLowercaseIdColumn()
    {
        await using var conn = new NpgsqlConnection(_fixture.ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            @"SELECT COUNT(*) FROM information_schema.columns
              WHERE table_name = 'VehicleHistory' AND column_name = 'id'", conn);

        var count = (long)(await cmd.ExecuteScalarAsync())!;

        Assert.Equal(1, count);
    }

    // ---------- Create / Read ----------

    [Fact]
    public async Task Insert_WithAllFields_PersistsAndReadsBack()
    {
        var vehicle = DbTestData.NewVehicle();
        var history = NewHistory(vehicle.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, history);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>().AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.Equal(vehicle.Id, saved.VehicleId);
        Assert.Equal("Active", saved.InsuranceStatus);
        Assert.Equal("Comprehensive", saved.InsuranceType);
        Assert.Equal("Registered", saved.RegistrationStatus);
        AssertSameInstant(history.CreatedAt, saved.CreatedAt);
        AssertSameInstant(history.RegistrationDate, saved.RegistrationDate);
        AssertSameInstant(history.RevenueLicenseLastRenewalDate, saved.RevenueLicenseLastRenewalDate);
        AssertSameInstant(history.RevenueLicenseExpiryDate, saved.RevenueLicenseExpiryDate);
        AssertSameInstant(history.InsuranceExpiryDate, saved.InsuranceExpiryDate);
        AssertSameInstant(history.LastOwnershipTransferDate, saved.LastOwnershipTransferDate);
        AssertSameInstant(history.UpdatedAt, saved.UpdatedAt);
    }

    [Fact]
    public async Task Insert_WithoutSettingId_UsesGeneratedGuid()
    {
        var history = new VehicleHistory();

        Assert.NotEqual(Guid.Empty, history.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        await using var read = _fixture.CreateContext();
        Assert.True(await read.Set<VehicleHistory>().AnyAsync(h => h.Id == history.Id));
    }

    [Fact]
    public async Task Insert_WithNoVehicleAndNoOptionalFields_Succeeds()
    {
        var history = new VehicleHistory();

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>().AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.Null(saved.VehicleId);
        Assert.Null(saved.CreatedAt);
        Assert.Null(saved.RegistrationDate);
        Assert.Null(saved.RevenueLicenseLastRenewalDate);
        Assert.Null(saved.RevenueLicenseExpiryDate);
        Assert.Null(saved.InsuranceStatus);
        Assert.Null(saved.InsuranceType);
        Assert.Null(saved.InsuranceExpiryDate);
        Assert.Null(saved.RegistrationStatus);
        Assert.Null(saved.LastOwnershipTransferDate);
        Assert.Null(saved.UpdatedAt);
    }

    [Fact]
    public async Task Insert_DuplicatePrimaryKey_ThrowsUniqueViolation()
    {
        var history = NewHistory();
        await using (var first = _fixture.CreateContext())
            await DbTestData.SaveAsync(first, history);

        var duplicate = NewHistory();
        duplicate.Id = history.Id;

        await using var ctx = _fixture.CreateContext();
        ctx.Add(duplicate);

        // 23505 = unique_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23505");
    }

    // ---------- Relationships ----------

    [Fact]
    public async Task Include_Vehicle_LoadsNavigationProperty()
    {
        var vehicle = DbTestData.NewVehicle();
        var history = NewHistory(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, history);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>()
            .Include(h => h.Vehicle)
            .AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.NotNull(saved.Vehicle);
        Assert.Equal(vehicle.Id, saved.Vehicle!.Id);
        Assert.Equal(vehicle.RegistrationNumber, saved.Vehicle.RegistrationNumber);
    }

    [Fact]
    public async Task Include_WithNoVehicle_NavigationIsNull()
    {
        var history = NewHistory();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>()
            .Include(h => h.Vehicle)
            .AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.Null(saved.Vehicle);
    }

    [Fact]
    public async Task Insert_WithNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var history = NewHistory(vehicleId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(history);

        // 23503 = foreign_key_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Update_ToNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var history = NewHistory();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        await using var ctx = _fixture.CreateContext();
        var tracked = await ctx.Set<VehicleHistory>().FirstAsync(h => h.Id == history.Id);
        tracked.VehicleId = Guid.NewGuid();

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Vehicle_CanHaveMultipleHistoryRecords()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle,
                NewHistory(vehicle.Id),
                NewHistory(vehicle.Id),
                NewHistory(vehicle.Id));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<VehicleHistory>().CountAsync(h => h.VehicleId == vehicle.Id);

        Assert.Equal(3, count);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_InsuranceFields_Persists()
    {
        var history = NewHistory();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        var newExpiry = DateTime.UtcNow.AddYears(1);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehicleHistory>().FirstAsync(h => h.Id == history.Id);
            tracked.InsuranceStatus = "Expired";
            tracked.InsuranceType = "Third Party";
            tracked.InsuranceExpiryDate = newExpiry;
            tracked.UpdatedAt = DateTime.UtcNow;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>().AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.Equal("Expired", saved.InsuranceStatus);
        Assert.Equal("Third Party", saved.InsuranceType);
        AssertSameInstant(newExpiry, saved.InsuranceExpiryDate);
    }

    [Fact]
    public async Task Update_ClearingVehicleId_SetsNull()
    {
        var vehicle = DbTestData.NewVehicle();
        var history = NewHistory(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, history);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehicleHistory>().FirstAsync(h => h.Id == history.Id);
            tracked.VehicleId = null;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehicleHistory>().AsNoTracking()
            .FirstAsync(h => h.Id == history.Id);

        Assert.Null(saved.VehicleId);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_RemovesHistory()
    {
        var history = NewHistory();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, history);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehicleHistory>().FirstAsync(h => h.Id == history.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.False(await read.Set<VehicleHistory>().AnyAsync(h => h.Id == history.Id));
    }

    [Fact]
    public async Task Delete_History_DoesNotDeleteVehicle()
    {
        var vehicle = DbTestData.NewVehicle();
        var history = NewHistory(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, history);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehicleHistory>().FirstAsync(h => h.Id == history.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.True(await read.Vehicles.AnyAsync(v => v.Id == vehicle.Id));
    }

    // ---------- Queries ----------
    // The container is shared across the collection, so every query is
    // scoped to a freshly created vehicle.

    [Fact]
    public async Task Query_ByInsuranceStatus_FiltersCorrectly()
    {
        var vehicle = DbTestData.NewVehicle();
        var active1 = NewHistory(vehicle.Id); active1.InsuranceStatus = "Active";
        var active2 = NewHistory(vehicle.Id); active2.InsuranceStatus = "Active";
        var expired = NewHistory(vehicle.Id); expired.InsuranceStatus = "Expired";
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, active1, active2, expired);

        await using var read = _fixture.CreateContext();
        var activeCount = await read.Set<VehicleHistory>()
            .CountAsync(h => h.VehicleId == vehicle.Id && h.InsuranceStatus == "Active");

        Assert.Equal(2, activeCount);
    }

    [Fact]
    public async Task Query_RevenueLicensesExpiredBeforeNow_ReturnsOnlyExpired()
    {
        var vehicle = DbTestData.NewVehicle();
        var expired = NewHistory(vehicle.Id);
        expired.RevenueLicenseExpiryDate = DateTime.UtcNow.AddDays(-10);
        var valid = NewHistory(vehicle.Id);
        valid.RevenueLicenseExpiryDate = DateTime.UtcNow.AddDays(100);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, expired, valid);

        await using var read = _fixture.CreateContext();
        var now = DateTime.UtcNow;
        var result = await read.Set<VehicleHistory>().AsNoTracking()
            .Where(h => h.VehicleId == vehicle.Id && h.RevenueLicenseExpiryDate < now)
            .ToListAsync();

        Assert.Single(result);
        Assert.Equal(expired.Id, result[0].Id);
    }

    [Fact]
    public async Task Query_LatestHistoryForVehicle_ReturnsMostRecentlyUpdated()
    {
        var vehicle = DbTestData.NewVehicle();
        var older = NewHistory(vehicle.Id); older.UpdatedAt = DateTime.UtcNow.AddDays(-30);
        var newer = NewHistory(vehicle.Id); newer.UpdatedAt = DateTime.UtcNow;
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, older, newer);

        await using var read = _fixture.CreateContext();
        var latest = await read.Set<VehicleHistory>().AsNoTracking()
            .Where(h => h.VehicleId == vehicle.Id)
            .OrderByDescending(h => h.UpdatedAt)
            .FirstAsync();

        Assert.Equal(newer.Id, latest.Id);
    }
}