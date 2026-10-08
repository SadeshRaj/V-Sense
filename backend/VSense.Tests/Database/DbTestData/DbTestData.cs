using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using Xunit;

namespace VSense.Tests.Database;

/// <summary>Shared builders and helpers for the database tests.</summary>
public static class DbTestData
{
    public static User NewUser(string? email = null) => new()
    {
        Id = Guid.NewGuid(),
        FullName = "Test User",
        Email = email ?? $"user_{Guid.NewGuid():N}@vsense.com",
        PhoneNumber = "0771234567",
        PasswordHash = "hash",
        Role = "Client",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    public static Vehicle NewVehicle()
    {
        var n = Guid.NewGuid().ToString("N");
        return new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = $"REG-{n}",
            VIN = $"VIN-{n}",
            LicenseNumber = $"LIC-{n}",
            ChassisNumber = $"CH-{n}",
            Make = "Toyota",
            Model = "Aqua",
            ManufacturingYear = 2018,
            FuelType = "Hybrid",
            Type = "Car"
        };
    }

    public static Organization NewOrganization() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test Garage",
        Email = $"org_{Guid.NewGuid():N}@vsense.com",
        Status = "Active"
    };

    public static Payment NewPayment(Guid? userId = null, Guid? vehicleId = null) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        VehicleId = vehicleId,
        TrasactionId = $"TX_{Guid.NewGuid():N}",
        Amount = 1000m,
        Status = "Completed",
        PaidAt = DateTime.UtcNow,
        CreatedAt = DateTime.UtcNow
    };

    /// <summary>A unique string of exactly the given length (length must be 32 or more).</summary>
    public static string Pad(int length) => Guid.NewGuid().ToString("N").PadRight(length, 'X');

    public static async Task SaveAsync(ApplicationDbContext ctx, params object[] entities)
    {
        ctx.AddRange(entities);
        await ctx.SaveChangesAsync();
    }

    /// <summary>Asserts the action fails with a DbUpdateException wrapping a PostgresException with the given SQL state.</summary>
    public static async Task AssertPgErrorAsync(Func<Task> action, string expectedSqlState)
    {
        var ex = await Assert.ThrowsAsync<DbUpdateException>(action);
        var pg = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(expectedSqlState, pg.SqlState);
    }
}