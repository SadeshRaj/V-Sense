using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class DatabaseExtendedTests
{
    private readonly PostgresFixture _fixture;

    public DatabaseExtendedTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static User NewUser(string? email = null) => new()
    {
        Id = Guid.NewGuid(),
        Email = email ?? $"user_{Guid.NewGuid()}@vsense.com",
        FullName = "Test User",
        PasswordHash = "hash",
        Role = "Customer",
        CreatedAt = DateTime.UtcNow
    };

    private string TableOf<T>()
    {
        using var ctx = _fixture.CreateContext();
        return ctx.Model.FindEntityType(typeof(T))!.GetTableName()!;
    }

    #region Schema checks

    [Fact] // DB-S1
    public async Task Schema_AllModelTablesExistInDatabase()
    {
        using var ctx = _fixture.CreateContext();

        var expected = ctx.Model.GetEntityTypes()
            .Select(e => e.GetTableName())
            .Where(n => n != null)
            .Distinct()
            .ToList();

        var actual = await ctx.Database
            .SqlQuery<string>($"SELECT table_name AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public'")
            .ToListAsync();

        foreach (var table in expected)
            Assert.Contains(table, actual);
    }

    [Theory] // DB-S2
    [InlineData(typeof(Vehicle))]
    [InlineData(typeof(Organization))]
    [InlineData(typeof(Payment))]
    [InlineData(typeof(VehicleOwnership))]
    [InlineData(typeof(VehicleHistory))]
    [InlineData(typeof(VehicleOwnershipHistory))]
    [InlineData(typeof(VehiclePoliceRecord))]
    public async Task Schema_PrimaryKeyColumn_IsLowercaseId(Type entityType)
    {
        using var ctx = _fixture.CreateContext();
        var table = ctx.Model.FindEntityType(entityType)!.GetTableName()!;

        var columns = await ctx.Database
            .SqlQuery<string>($"SELECT column_name AS \"Value\" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = {table}")
            .ToListAsync();

        Assert.Contains("id", columns);
    }

    [Fact] // DB-S3
    public async Task Schema_OrganizationIsVerified_IsNotMappedToColumn()
    {
        using var ctx = _fixture.CreateContext();

        var columns = await ctx.Database
            .SqlQuery<string>($"SELECT column_name AS \"Value\" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organizations'")
            .ToListAsync();

        Assert.DoesNotContain("IsVerified", columns);
    }

    [Fact] // DB-S4
    public async Task Schema_UsersEmail_HasUniqueIndex()
    {
        using var ctx = _fixture.CreateContext();

        var indexes = await ctx.Database
            .SqlQuery<string>($"SELECT indexdef AS \"Value\" FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Users'")
            .ToListAsync();

        Assert.Contains(indexes, i => i.Contains("UNIQUE") && i.Contains("Email"));
    }

    #endregion

    #region Data round trip

    [Fact] // DB-D1
    public async Task Persistence_UserRoundTrip_FieldsMatch()
    {
        var user = NewUser();

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        using var verify = _fixture.CreateContext();
        var saved = await verify.Users.FindAsync(user.Id);

        Assert.NotNull(saved);
        Assert.Equal(user.Email, saved!.Email);
        Assert.Equal(user.FullName, saved.FullName);
        Assert.Equal(user.PasswordHash, saved.PasswordHash);
        Assert.Equal(user.Role, saved.Role);
    }

    #endregion

    #region Transactions

    [Fact] // DB-T2
    public async Task Transaction_CommitPersistsData()
    {
        var user = NewUser();

        using (var ctx = _fixture.CreateContext())
        {
            using var tx = await ctx.Database.BeginTransactionAsync();
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
            await tx.CommitAsync();
        }

        using var verify = _fixture.CreateContext();
        Assert.Equal(1, await verify.Users.CountAsync(u => u.Id == user.Id));
    }

    [Fact] // DB-T3
    public async Task Transaction_SaveChangesIsAtomic_FailureLeavesNothingBehind()
    {
        var email = $"atomic_{Guid.NewGuid()}@vsense.com";

        using (var ctx = _fixture.CreateContext())
        {
            // Two users, same email, saved in ONE SaveChanges call
            ctx.Users.Add(NewUser(email));
            ctx.Users.Add(NewUser(email));

            await Assert.ThrowsAsync<DbUpdateException>(() => ctx.SaveChangesAsync());
        }

        using var verify = _fixture.CreateContext();
        Assert.Equal(0, await verify.Users.CountAsync(u => u.Email == email));
    }

    [Fact] // DB-T4
    public async Task Concurrency_ParallelInsertSameEmail_ExactlyOneSucceeds()
    {
        var email = $"parallel_{Guid.NewGuid()}@vsense.com";

        async Task<bool> TryInsert()
        {
            using var ctx = _fixture.CreateContext();
            ctx.Users.Add(NewUser(email));
            try
            {
                await ctx.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException)
            {
                return false;
            }
        }

        var results = await Task.WhenAll(TryInsert(), TryInsert());

        Assert.Equal(1, results.Count(r => r));

        using var verify = _fixture.CreateContext();
        Assert.Equal(1, await verify.Users.CountAsync(u => u.Email == email));
    }

    #endregion

    #region Constraint detail

    [Fact] // DB-C1
    public async Task Constraint_DuplicateEmail_FailsWithUniqueViolationCode()
    {
        var email = $"dup_{Guid.NewGuid()}@vsense.com";

        using var ctx = _fixture.CreateContext();
        ctx.Users.Add(NewUser(email));
        await ctx.SaveChangesAsync();

        ctx.Users.Add(NewUser(email));
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => ctx.SaveChangesAsync());

        var pg = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, pg.SqlState); // 23505
    }

    [Fact] // DB-C2
    public async Task Constraint_InvalidPaymentForeignKey_FailsWithForeignKeyViolationCode()
    {
        using var ctx = _fixture.CreateContext();
        ctx.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            VehicleId = Guid.NewGuid(),
            TrasactionId = $"TX_{Guid.NewGuid()}",
            Amount = 100m,
            Status = "Completed",
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });

        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => ctx.SaveChangesAsync());

        var pg = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, pg.SqlState); // 23503
    }

    #endregion
}