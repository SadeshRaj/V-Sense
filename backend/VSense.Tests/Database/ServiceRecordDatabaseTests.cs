// VSense.Tests/Database/ServiceRecordDatabaseTests.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class ServiceRecordDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public ServiceRecordDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    // ---------- Local builders / helpers ----------

    // VehicleId and GarageId are non-nullable FKs, so a real vehicle and
    // organization must be seeded first.
    private static ServiceRecord NewRecord(
        Guid vehicleId,
        Guid garageId,
        int odometer = 45000,
        string title = "Oil Change") => new()
    {
        VehicleId = vehicleId,
        GarageId = garageId,
        Title = title,
        Description = "Replaced engine oil and filter",
        OdometerReading = odometer,
        PaymentMethod = "Cash",
        PhotoUrls = "https://res.cloudinary.com/demo/image/upload/a.jpg",
        CreatedAt = DateTime.UtcNow
    };

    private static async Task<(Vehicle vehicle, Organization garage)> SeedParentsAsync(
        PostgresFixture fixture)
    {
        var vehicle = DbTestData.NewVehicle();
        var garage = DbTestData.NewOrganization();
        await using var ctx = fixture.CreateContext();
        await DbTestData.SaveAsync(ctx, vehicle, garage);
        return (vehicle, garage);
    }

    private static void AssertSameInstant(DateTime expected, DateTime actual)
    {
        Assert.True((expected - actual).Duration() < TimeSpan.FromSeconds(1),
            $"Expected {expected:O} but got {actual:O}");
    }

    // ---------- Schema ----------

    [Fact]
    public async Task Schema_TableIsNamedServiceRecords()
    {
        await using var conn = new NpgsqlConnection(_fixture.ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ServiceRecords'", conn);

        var count = (long)(await cmd.ExecuteScalarAsync())!;

        Assert.Equal(1, count);
    }

    // ---------- Create / Read ----------

    [Fact]
    public async Task Insert_WithAllFields_PersistsAndReadsBack()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id, odometer: 52300);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<ServiceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal(vehicle.Id, saved.VehicleId);
        Assert.Equal(garage.Id, saved.GarageId);
        Assert.Equal("Oil Change", saved.Title);
        Assert.Equal("Replaced engine oil and filter", saved.Description);
        Assert.Equal(52300, saved.OdometerReading);
        Assert.Equal("Cash", saved.PaymentMethod);
        Assert.Equal(record.PhotoUrls, saved.PhotoUrls);
        AssertSameInstant(record.CreatedAt, saved.CreatedAt);
    }

    [Fact]
    public async Task Insert_UsingEntityDefaults_GeneratesIdAndCreatedAt()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var before = DateTime.UtcNow.AddSeconds(-5);

        var record = new ServiceRecord { VehicleId = vehicle.Id, GarageId = garage.Id };

        Assert.NotEqual(Guid.Empty, record.Id);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<ServiceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal(string.Empty, saved.Title);
        Assert.Equal(string.Empty, saved.Description);
        Assert.Equal(string.Empty, saved.PaymentMethod);
        Assert.Equal(string.Empty, saved.PhotoUrls);
        Assert.Equal(0, saved.OdometerReading);
        Assert.True(saved.CreatedAt >= before);
    }

    [Fact]
    public async Task Insert_DuplicatePrimaryKey_ThrowsUniqueViolation()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var first = _fixture.CreateContext())
            await DbTestData.SaveAsync(first, record);

        var duplicate = NewRecord(vehicle.Id, garage.Id);
        duplicate.Id = record.Id;

        await using var ctx = _fixture.CreateContext();
        ctx.Add(duplicate);

        // 23505 = unique_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23505");
    }

    [Theory]
    [InlineData("Title")]
    [InlineData("Description")]
    [InlineData("PaymentMethod")]
    [InlineData("PhotoUrls")]
    public async Task Insert_WithNullRequiredString_ThrowsNotNullViolation(string property)
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);

        switch (property)
        {
            case "Title": record.Title = null!; break;
            case "Description": record.Description = null!; break;
            case "PaymentMethod": record.PaymentMethod = null!; break;
            case "PhotoUrls": record.PhotoUrls = null!; break;
        }

        await using var ctx = _fixture.CreateContext();
        ctx.Add(record);

        // 23502 = not_null_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23502");
    }

    [Fact]
    public async Task Insert_WithLongPhotoUrls_IsPersisted()
    {
        // PhotoUrls likely holds several Cloudinary URLs joined together.
        // If you configure a max length for this column, adjust or remove this test.
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        record.PhotoUrls = DbTestData.Pad(2000);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<ServiceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal(2000, saved.PhotoUrls.Length);
    }

    // ---------- Relationships ----------

    [Fact]
    public async Task Include_Vehicle_And_Organization_LoadsNavigations()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<ServiceRecord>()
            .Include(r => r.Vehicle)
            .Include(r => r.Organization)
            .AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.NotNull(saved.Vehicle);
        Assert.NotNull(saved.Organization);
        Assert.Equal(vehicle.Id, saved.Vehicle!.Id);
        Assert.Equal(vehicle.RegistrationNumber, saved.Vehicle.RegistrationNumber);
        Assert.Equal(garage.Id, saved.Organization!.Id);
        Assert.Equal(garage.Name, saved.Organization.Name);
    }

    [Fact]
    public async Task Insert_WithNonExistentVehicle_ThrowsForeignKeyViolation()
    {
        var garage = DbTestData.NewOrganization();
        await using (var setup = _fixture.CreateContext())
            await DbTestData.SaveAsync(setup, garage);

        var record = NewRecord(Guid.NewGuid(), garage.Id);

        await using var ctx = _fixture.CreateContext();
        ctx.Add(record);

        // 23503 = foreign_key_violation
        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Insert_WithNonExistentGarage_ThrowsForeignKeyViolation()
    {
        var vehicle = DbTestData.NewVehicle();
        await using (var setup = _fixture.CreateContext())
            await DbTestData.SaveAsync(setup, vehicle);

        var record = NewRecord(vehicle.Id, Guid.NewGuid());

        await using var ctx = _fixture.CreateContext();
        ctx.Add(record);

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Insert_WithEmptyGuidForeignKeys_ThrowsForeignKeyViolation()
    {
        // VehicleId/GarageId are non-nullable, so forgetting to set them
        // sends Guid.Empty, which must not match any row.
        var record = new ServiceRecord { Title = "No parents" };

        await using var ctx = _fixture.CreateContext();
        ctx.Add(record);

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Update_ToNonExistentGarage_ThrowsForeignKeyViolation()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using var ctx = _fixture.CreateContext();
        var tracked = await ctx.Set<ServiceRecord>().FirstAsync(r => r.Id == record.Id);
        tracked.GarageId = Guid.NewGuid();

        await DbTestData.AssertPgErrorAsync(() => ctx.SaveChangesAsync(), "23503");
    }

    [Fact]
    public async Task Vehicle_CanHaveRecordsFromMultipleGarages()
    {
        var vehicle = DbTestData.NewVehicle();
        var garage1 = DbTestData.NewOrganization();
        var garage2 = DbTestData.NewOrganization();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, vehicle, garage1, garage2,
                NewRecord(vehicle.Id, garage1.Id),
                NewRecord(vehicle.Id, garage2.Id));

        await using var read = _fixture.CreateContext();
        var garageIds = await read.Set<ServiceRecord>().AsNoTracking()
            .Where(r => r.VehicleId == vehicle.Id)
            .Select(r => r.GarageId)
            .ToListAsync();

        Assert.Equal(2, garageIds.Count);
        Assert.Contains(garage1.Id, garageIds);
        Assert.Contains(garage2.Id, garageIds);
    }

    [Fact]
    public async Task Garage_CanServiceMultipleVehicles()
    {
        var garage = DbTestData.NewOrganization();
        var v1 = DbTestData.NewVehicle();
        var v2 = DbTestData.NewVehicle();
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, garage, v1, v2,
                NewRecord(v1.Id, garage.Id),
                NewRecord(v2.Id, garage.Id));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<ServiceRecord>().CountAsync(r => r.GarageId == garage.Id);

        Assert.Equal(2, count);
    }

    // ---------- Update ----------

    [Fact]
    public async Task Update_AllEditableFields_Persists()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using (var update = _fixture.CreateContext())
        {
            var tracked = await update.Set<ServiceRecord>().FirstAsync(r => r.Id == record.Id);
            tracked.Title = "Brake Pad Replacement";
            tracked.Description = "Front pads replaced";
            tracked.OdometerReading = 60000;
            tracked.PaymentMethod = "Card";
            tracked.PhotoUrls = "https://res.cloudinary.com/demo/image/upload/b.jpg";
            await update.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        var saved = await read.Set<ServiceRecord>().AsNoTracking()
            .FirstAsync(r => r.Id == record.Id);

        Assert.Equal("Brake Pad Replacement", saved.Title);
        Assert.Equal("Front pads replaced", saved.Description);
        Assert.Equal(60000, saved.OdometerReading);
        Assert.Equal("Card", saved.PaymentMethod);
        Assert.EndsWith("b.jpg", saved.PhotoUrls);
    }

    // ---------- Delete ----------

    [Fact]
    public async Task Delete_RemovesRecord()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<ServiceRecord>().FirstAsync(r => r.Id == record.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.False(await read.Set<ServiceRecord>().AnyAsync(r => r.Id == record.Id));
    }

    [Fact]
    public async Task Delete_Record_DoesNotDeleteVehicleOrOrganization()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);
        var record = NewRecord(vehicle.Id, garage.Id);
        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, record);

        await using (var delete = _fixture.CreateContext())
        {
            var tracked = await delete.Set<ServiceRecord>().FirstAsync(r => r.Id == record.Id);
            delete.Remove(tracked);
            await delete.SaveChangesAsync();
        }

        await using var read = _fixture.CreateContext();
        Assert.True(await read.Vehicles.AnyAsync(v => v.Id == vehicle.Id));
        Assert.True(await read.Set<Organization>().AnyAsync(o => o.Id == garage.Id));
    }

    // ---------- Queries ----------
    // The container is shared across the collection, so every query is
    // scoped to a freshly created vehicle or garage.

    [Fact]
    public async Task Query_VehicleServiceHistory_OrderedNewestFirst()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);

        var oldest = NewRecord(vehicle.Id, garage.Id, 30000, "Inspection");
        oldest.CreatedAt = DateTime.UtcNow.AddDays(-60);
        var middle = NewRecord(vehicle.Id, garage.Id, 40000, "Oil Change");
        middle.CreatedAt = DateTime.UtcNow.AddDays(-30);
        var newest = NewRecord(vehicle.Id, garage.Id, 50000, "Tyre Rotation");
        newest.CreatedAt = DateTime.UtcNow;

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, oldest, middle, newest);

        await using var read = _fixture.CreateContext();
        var history = await read.Set<ServiceRecord>().AsNoTracking()
            .Where(r => r.VehicleId == vehicle.Id)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        Assert.Equal(new[] { newest.Id, middle.Id, oldest.Id }, history.Select(r => r.Id).ToArray());
    }

    [Fact]
    public async Task Query_HighestOdometerForVehicle_ReturnsMax()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write,
                NewRecord(vehicle.Id, garage.Id, 30000),
                NewRecord(vehicle.Id, garage.Id, 75000),
                NewRecord(vehicle.Id, garage.Id, 50000));

        await using var read = _fixture.CreateContext();
        var max = await read.Set<ServiceRecord>()
            .Where(r => r.VehicleId == vehicle.Id)
            .MaxAsync(r => r.OdometerReading);

        Assert.Equal(75000, max);
    }

    [Fact]
    public async Task Query_ByOdometerRange_FiltersCorrectly()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write,
                NewRecord(vehicle.Id, garage.Id, 10000),
                NewRecord(vehicle.Id, garage.Id, 40000),
                NewRecord(vehicle.Id, garage.Id, 60000),
                NewRecord(vehicle.Id, garage.Id, 90000));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<ServiceRecord>()
            .CountAsync(r => r.VehicleId == vehicle.Id
                          && r.OdometerReading >= 30000
                          && r.OdometerReading <= 70000);

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task Query_ByTitleContains_FindsMatches()
    {
        var (vehicle, garage) = await SeedParentsAsync(_fixture);

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write,
                NewRecord(vehicle.Id, garage.Id, 10000, "Engine Oil Change"),
                NewRecord(vehicle.Id, garage.Id, 20000, "Brake Inspection"),
                NewRecord(vehicle.Id, garage.Id, 30000, "Oil Filter Replacement"));

        await using var read = _fixture.CreateContext();
        var count = await read.Set<ServiceRecord>()
            .CountAsync(r => r.VehicleId == vehicle.Id && r.Title.Contains("Oil"));

        Assert.Equal(2, count);
    }

    [Fact]
    public async Task Query_GarageRecords_GroupedByPaymentMethod()
    {
        var garage = DbTestData.NewOrganization();
        var vehicle = DbTestData.NewVehicle();
        await using (var setup = _fixture.CreateContext())
            await DbTestData.SaveAsync(setup, garage, vehicle);

        var cash1 = NewRecord(vehicle.Id, garage.Id); cash1.PaymentMethod = "Cash";
        var cash2 = NewRecord(vehicle.Id, garage.Id); cash2.PaymentMethod = "Cash";
        var card = NewRecord(vehicle.Id, garage.Id); card.PaymentMethod = "Card";

        await using (var write = _fixture.CreateContext())
            await DbTestData.SaveAsync(write, cash1, cash2, card);

        await using var read = _fixture.CreateContext();
        var grouped = await read.Set<ServiceRecord>()
            .Where(r => r.GarageId == garage.Id)
            .GroupBy(r => r.PaymentMethod)
            .Select(g => new { Method = g.Key, Count = g.Count() })
            .ToListAsync();

        Assert.Equal(2, grouped.Single(g => g.Method == "Cash").Count);
        Assert.Equal(1, grouped.Single(g => g.Method == "Card").Count);
    }
}