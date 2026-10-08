// VSense.Tests/Database/VehiclePoliceRecordDatabaseTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class VehiclePoliceRecordDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public VehiclePoliceRecordDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    // ---------- Local builders / helpers ----------

    private static VehiclePoliceRecord NewRecord(
        Guid? vehicleId = null,
        string? incidentType = "Accident",
        string? severity = "Minor") => new()
    {
        VehicleId = vehicleId,
        IncidentDate = DateTime.UtcNow.AddMonths(-3),
        IncidentType = incidentType,
        Description = "Rear-end collision at a junction",
        Severity = severity,
        PoliceStation = "Colombo Fort",
        CreatedAt = DateTime.UtcNow
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
    public async Task Schema_TableIsNamedVehiclePoliceRecords_WithLowercaseIdColumn()
    {
        await using var conn = new NpgsqlConnection(_fixture.ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            @"SELECT COUNT(*) FROM information_schema.columns
              WHERE table_name = 'VehiclePoliceRecords' AND column_name = 'id'", conn);

        var count = (long)(await cmd.ExecuteScalarAsync())!;

        Assert.Equal(1, count);
    }

    // ---------- Create / Read ----------

    [Fact]
    public async Task Insert_WithAllFields_PersistsAndReadsBack()
    {
        var vehicle = DbTestData.NewVehicle();
        var record = NewRecord(vehicle.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal(vehicle.Id, saved.VehicleId);
        Assert.Equal("Accident", saved.IncidentType);
        Assert.Equal("Rear-end collision at a junction", saved.Description);
        Assert.Equal("Minor", saved.Severity);
        Assert.Equal("Colombo Fort", saved.PoliceStation);
        AssertSameInstant(record.IncidentDate, saved.IncidentDate);
        AssertSameInstant(record.CreatedAt, saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_UsingEntityDefaults_GeneratesIdAndCreatedAt()
    {
        var before = DateTime.UtcNow.AddSeconds(-5);
        var record = new VehiclePoliceRecord();

        Assert.NotEqual(Guid.Empty, record.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.NotNull(saved.CreatedAt);
        Assert.True(saved.CreatedAt >= before);
        Assert.Null(saved.VehicleId);
        Assert.Null(saved.IncidentDate);
        Assert.Null(saved.IncidentType);
        Assert.Null(saved.Description);
        Assert.Null(saved.Severity);
        Assert.Null(saved.PoliceStation);
    }

    [Fact]
    public async Task Insert_WithExplicitNullCreatedAt_PersistsNull()
    {
        var record = NewRecord();
        record.CreatedAt = null;

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Null(saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_DuplicatePrimaryKey_ThrowsUniqueViolation()
    {
        var record = NewRecord();
        await using (var first = _fixture.CreateContext())
            await DbTestData.SaveAsync(first, record);

        var duplicate = NewRecord();
        duplicate.Id = record.Id;

        await using var ctx = _fixture.CreateContext();
        ctx.Add(duplicate);

        // 23505 = unique_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23505");
    }

    [Fact]
    public async Task Insert_WithLongDescription_IsPersisted()
    {
        // If you configure a max length for Description, adjust or remove this test.
        var record = NewRecord();
        record.Description = DbTestData.Pad(2000);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal(2000, saved.Description!.Length);
    }

    // ---------- Relationships ----------

    [Fact]
    public async Task Include_Vehicle_LoadsNavigationProperty()
    {
        var vehicle = DbTestData.NewVehicle();
        var record = NewRecord(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>()
            .Include(r => r.Vehicle)
            .AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.NotNull(saved.Vehicle);
        Assert.Equal(vehicle.Id, saved.Vehicle!.Id);
        Assert.Equal(vehicle.RegistrationNumber, saved.Vehicle.RegistrationNumber);
    }

    [Fact]
    public async Task Include_WithNoVehicle_NavigationIsNull()
    {
        var record = NewRecord();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>()
            .Include(r => r.Vehicle)
            .AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Null(saved.Vehicle);
    }

    [Fact]
    public async Task Insert_WithNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var record = NewRecord(vehicleId: Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(record);

        // 23503 = foreign_key_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Update_ToNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var record = NewRecord();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var ctx = _fixture.CreateContext();
        var tracked = await ctx.Set<VehiclePoliceRecord>().FirstAsync(r => r.Id == record.Id);
        tracked.VehicleId = Guid.NewGuid();

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Vehicle_CanHaveMultiplePoliceRecords()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle,
                NewRecord(vehicle.Id, "Accident"),
                NewRecord(vehicle.Id, "Theft"),
                NewRecord(vehicle.Id, "Traffic Violation"));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<VehiclePoliceRecord>().CountAsync(r => r.VehicleId == vehicle.Id);

        Assert.Equal(3, count);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_IncidentDetails_Persists()
    {
        var record = NewRecord();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        var newDate = DateTime.UtcNow.AddDays(-10);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehiclePoliceRecord>().FirstAsync(r => r.Id == record.Id);
            tracked.IncidentType = "Theft";
            tracked.Severity = "Major";
            tracked.PoliceStation = "Kandy";
            tracked.Description = "Vehicle reported stolen";
            tracked.IncidentDate = newDate;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal("Theft", saved.IncidentType);
        Assert.Equal("Major", saved.Severity);
        Assert.Equal("Kandy", saved.PoliceStation);
        Assert.Equal("Vehicle reported stolen", saved.Description);
        AssertSameInstant(newDate, saved.IncidentDate);
    }

    [Fact]
    public async Task Update_ClearingVehicleId_SetsNull()
    {
        var vehicle = DbTestData.NewVehicle();
        var record = NewRecord(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, record);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<VehiclePoliceRecord>().FirstAsync(r => r.Id == record.Id);
            tracked.VehicleId = null;
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Null(saved.VehicleId);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_RemovesRecord()
    {
        var record = NewRecord();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehiclePoliceRecord>().FirstAsync(r => r.Id == record.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.False(await read.Set<VehiclePoliceRecord>().AnyAsync(r => r.Id == record.Id));
    }

    [Fact]
    public async Task Delete_Record_DoesNotDeleteVehicle()
    {
        var vehicle = DbTestData.NewVehicle();
        var record = NewRecord(vehicle.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, record);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<VehiclePoliceRecord>().FirstAsync(r => r.Id == record.Id);
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
    public async Task Query_BySeverity_FiltersCorrectly()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle,
                NewRecord(vehicle.Id, severity: "Minor"),
                NewRecord(vehicle.Id, severity: "Major"),
                NewRecord(vehicle.Id, severity: "Major"));

        await using var read = _fixture.CreateContext();
        var majorCount = await read.Set<VehiclePoliceRecord>()
            .CountAsync(r => r.VehicleId == vehicle.Id && r.Severity == "Major");

        Assert.Equal(2, majorCount);
    }

    [Fact]
    public async Task Query_ByIncidentType_FiltersCorrectly()
    {
        var vehicle = DbTestData.NewVehicle();
        var theft = NewRecord(vehicle.Id, incidentType: "Theft");
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle,
                NewRecord(vehicle.Id, incidentType: "Accident"),
                theft);

        await using var read = _fixture.CreateContext();
        var result = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .Where(r => r.VehicleId == vehicle.Id && r.IncidentType == "Theft")
            .ToListAsync();

        Assert.Single(result);
        Assert.Equal(theft.Id, result[0].Id);
    }

    [Fact]
    public async Task Query_IncidentsInDateRange_ReturnsOnlyMatching()
    {
        var vehicle = DbTestData.NewVehicle();

        var old = NewRecord(vehicle.Id); old.IncidentDate = DateTime.UtcNow.AddYears(-3);
        var recent = NewRecord(vehicle.Id); recent.IncidentDate = DateTime.UtcNow.AddMonths(-2);
        var undated = NewRecord(vehicle.Id); undated.IncidentDate = null;

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, old, recent, undated);

        await using var read = _fixture.CreateContext();
        var since = DateTime.UtcNow.AddYears(-1);
        var result = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .Where(r => r.VehicleId == vehicle.Id && r.IncidentDate >= since)
            .ToListAsync();

        Assert.Single(result);
        Assert.Equal(recent.Id, result[0].Id);
    }

    [Fact]
    public async Task Query_MostRecentIncident_ReturnsLatestByIncidentDate()
    {
        var vehicle = DbTestData.NewVehicle();

        var older = NewRecord(vehicle.Id); older.IncidentDate = DateTime.UtcNow.AddYears(-2);
        var newer = NewRecord(vehicle.Id); newer.IncidentDate = DateTime.UtcNow.AddDays(-5);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, older, newer);

        await using var read = _fixture.CreateContext();
        var latest = await read.Set<VehiclePoliceRecord>().AsNoTracking()
            .Where(r => r.VehicleId == vehicle.Id)
            .OrderByDescending(r => r.IncidentDate)
            .FirstAsync();

        Assert.Equal(newer.Id, latest.Id);
    }

    [Fact]
    public async Task Query_VehicleWithNoPoliceRecords_ReturnsEmpty()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle);

        await using var read = _fixture.CreateContext();
        var hasRecords = await read.Set<VehiclePoliceRecord>().AnyAsync(r => r.VehicleId == vehicle.Id);

        Assert.False(hasRecords);
    }
}