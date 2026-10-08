using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using VSense.Infrastructure.Persistence;
using Xunit;

namespace VSense.Tests.Database;

public class PostgresFixture : IAsyncLifetime
{
    // Image passed to the constructor (fixes the CS0618 obsolete warning)
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("vsense_test_db")
        .WithUsername("postgres")
        .WithPassword("postgres_test_password")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        // 1. Spin up a throwaway PostgreSQL Docker container (never touches Supabase)
        await _container.StartAsync();

        // 2. Build the schema directly from the EF Core model.
        // NOTE: The existing migration history has no baseline (no CreateTable for
        // Organizations, Users, Vehicles, etc.), so MigrateAsync() fails on an empty DB.
        // EnsureCreatedAsync() avoids that without changing migrations or the real database.
        using var context = CreateContext();
        await context.Database.EnsureCreatedAsync();
    }

    public ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString, b =>
                b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName))
            .Options;

        return new ApplicationDbContext(options);
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }
}

[CollectionDefinition("PostgresDatabaseCollection")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
}