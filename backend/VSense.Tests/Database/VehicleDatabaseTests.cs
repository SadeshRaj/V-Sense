using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;
using static VSense.Tests.Database.DbTestData;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class VehicleDatabaseTests
{
    private readonly PostgresFixture _fixture;

    public VehicleDatabaseTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static string Get(Vehicle v, string field) => field switch
    {
        "RegistrationNumber" => v.RegistrationNumber,
        "VIN" => v.VIN,
        "Make" => v.Make ?? "",
        "Model" => v.Model ?? "",
        "FuelType" => v.FuelType ?? "",
        "ChassisNumber" => v.ChassisNumber ?? "",
        "Type" => v.Type ?? "",
        "LicenseNumber" => v.LicenseNumber ?? "",
        _ => throw new ArgumentException(field)
    };

    private static void Set(Vehicle v, string field, string value)
    {
        switch (field)
        {
            case "RegistrationNumber": v.RegistrationNumber = value; break;
            case "VIN": v.VIN = value; break;
            case "Make": v.Make = value; break;
            case "Model": v.Model = value; break;
            case "FuelType": v.FuelType = value; break;
            case "ChassisNumber": v.ChassisNumber = value; break;
            case "Type": v.Type = value; break;
            case "LicenseNumber": v.LicenseNumber = value; break;
            default: throw new ArgumentException(field);
        }
    }

    [Fact] // DB-VH1
    public async Task RoundTrip_AllFields_Match()
    {
        var v = NewVehicle();
        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, v);

        using var verify = _fixture.CreateContext();
        var saved = await verify.Vehicles.FindAsync(v.Id);

        Assert.NotNull(saved);
        Assert.Equal(v.RegistrationNumber, saved!.RegistrationNumber);
        Assert.Equal(v.VIN, saved.VIN);
        Assert.Equal(v.LicenseNumber, saved.LicenseNumber);
        Assert.Equal(v.ChassisNumber, saved.ChassisNumber);
        Assert.Equal("Toyota", saved.Make);
        Assert.Equal("Aqua", saved.Model);
        Assert.Equal((short)2018, saved.ManufacturingYear);
        Assert.Equal("Hybrid", saved.FuelType);
        Assert.Equal("Car", saved.Type);
    }

    [Theory] // DB-VH2
    [InlineData("RegistrationNumber")]
    [InlineData("VIN")]
    [InlineData("LicenseNumber")]
    public async Task Constraint_DuplicateUniqueField_ThrowsUniqueViolation(string field)
    {
        var first = NewVehicle();
        var second = NewVehicle();
        Set(second, field, Get(first, field));

        using var ctx = _fixture.CreateContext();
        await SaveAsync(ctx, first);

        await AssertPgErrorAsync(() => SaveAsync(ctx, second), PostgresErrorCodes.UniqueViolation);
    }

    [Fact] // DB-VH3
    public async Task Constraint_MultipleNullLicenseNumbers_AreAllowed()
    {
        var a = NewVehicle(); a.LicenseNumber = null;
        var b = NewVehicle(); b.LicenseNumber = null;

        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, a, b);

        using var verify = _fixture.CreateContext();
        Assert.Equal(2, await verify.Vehicles.CountAsync(v => v.Id == a.Id || v.Id == b.Id));
    }

    [Theory] // DB-VH4
    [InlineData("RegistrationNumber", 50)]
    [InlineData("VIN", 100)]
    [InlineData("Make", 100)]
    [InlineData("Model", 100)]
    [InlineData("FuelType", 100)]
    [InlineData("ChassisNumber", 100)]
    [InlineData("Type", 50)]
    [InlineData("LicenseNumber", 100)]
    public async Task MaxLength_ExactlyAtLimit_IsAccepted(string field, int max)
    {
        var v = NewVehicle();
        Set(v, field, Pad(max));

        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, v);

        using var verify = _fixture.CreateContext();
        var saved = await verify.Vehicles.FindAsync(v.Id);
        Assert.Equal(max, Get(saved!, field).Length);
    }

    [Theory] // DB-VH5
    [InlineData("RegistrationNumber", 50)]
    [InlineData("VIN", 100)]
    [InlineData("Make", 100)]
    [InlineData("Model", 100)]
    [InlineData("FuelType", 100)]
    [InlineData("ChassisNumber", 100)]
    [InlineData("Type", 50)]
    [InlineData("LicenseNumber", 100)]
    public async Task MaxLength_OneOverLimit_IsRejected(string field, int max)
    {
        var v = NewVehicle();
        Set(v, field, Pad(max + 1));

        using var ctx = _fixture.CreateContext();

        await AssertPgErrorAsync(() => SaveAsync(ctx, v), PostgresErrorCodes.StringDataRightTruncation); // 22001
    }

    [Theory] // DB-VH6 (raw SQL so the database constraint itself is tested)
    [InlineData("RegistrationNumber")]
    [InlineData("VIN")]
    public async Task Constraint_NullInRequiredColumn_ThrowsNotNullViolation(string nullColumn)
    {
        using var ctx = _fixture.CreateContext();
        var n = Guid.NewGuid().ToString("N");

        string V(string column, string literal) => column == nullColumn ? "NULL" : literal;

        var sql = "INSERT INTO \"Vehicles\" (\"id\",\"RegistrationNumber\",\"VIN\") VALUES (" +
                  $"'{Guid.NewGuid()}', {V("RegistrationNumber", $"'R{n}'")}, {V("VIN", $"'V{n}'")})";

        var ex = await Assert.ThrowsAsync<PostgresException>(() => ctx.Database.ExecuteSqlRawAsync(sql));

        Assert.Equal(PostgresErrorCodes.NotNullViolation, ex.SqlState);
        Assert.Equal(nullColumn, ex.ColumnName);
    }

    [Fact] // DB-VH7 (documents a gap: [Required] only means NOT NULL, so blank is accepted)
    public async Task Constraint_BlankRegistrationNumber_IsAcceptedByDatabase()
    {
        // No other test may insert a blank registration number (unique index).
        var v = NewVehicle();
        v.RegistrationNumber = "";

        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, v);

        using var verify = _fixture.CreateContext();
        Assert.NotNull(await verify.Vehicles.FindAsync(v.Id));
    }

    [Theory] // DB-VH8 (documents a gap: no range check on ManufacturingYear)
    [InlineData((short)0)]
    [InlineData((short)9999)]
    [InlineData(short.MaxValue)]
    public async Task Boundary_ManufacturingYear_AnyShortIsAccepted(short year)
    {
        var v = NewVehicle();
        v.ManufacturingYear = year;

        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, v);

        using var verify = _fixture.CreateContext();
        var saved = await verify.Vehicles.FindAsync(v.Id);
        Assert.Equal(year, saved!.ManufacturingYear);
    }

    [Fact] // DB-VH9
    public async Task Query_FindByVin_ReturnsOnlyThatVehicle()
    {
        var target = NewVehicle();
        var other = NewVehicle();
        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, target, other);

        using var verify = _fixture.CreateContext();
        var found = await verify.Vehicles.FirstOrDefaultAsync(v => v.VIN == target.VIN);

        Assert.NotNull(found);
        Assert.Equal(target.Id, found!.Id);
    }

    [Fact] // DB-VH10
    public async Task Delete_VehicleWithoutDependents_RemovesRow()
    {
        var v = NewVehicle();
        using (var ctx = _fixture.CreateContext()) await SaveAsync(ctx, v);

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Vehicles.Remove(await ctx.Vehicles.FirstAsync(x => x.Id == v.Id));
            await ctx.SaveChangesAsync();
        }

        using var verify = _fixture.CreateContext();
        Assert.Null(await verify.Vehicles.FindAsync(v.Id));
    }
}