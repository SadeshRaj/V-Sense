using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Database;

[Collection("PostgresDatabaseCollection")]
public class DatabaseUserEntityTests
{
    private readonly PostgresFixture _fixture;

    public DatabaseUserEntityTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    private static User NewUser(string? email = null) => new()
    {
        Id = Guid.NewGuid(),
        FullName = "Test User",
        Email = email ?? $"user_{Guid.NewGuid()}@vsense.com",
        PhoneNumber = "0771234567",
        PasswordHash = "hash",
        Role = "Client",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    private async Task<User?> Reload(Guid id)
    {
        using var ctx = _fixture.CreateContext();
        return await ctx.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
    }

    #region Defaults and nullable columns

    [Fact] // DB-U1
    public async Task Defaults_NewUserWithOnlyEmail_UsesEntityDefaults()
    {
        var id = Guid.NewGuid();
        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(new User { Id = id, Email = $"defaults_{id}@vsense.com" });
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(id);

        Assert.NotNull(saved);
        Assert.Equal("Client", saved!.Role);
        Assert.True(saved.IsActive);
        Assert.Equal(string.Empty, saved.FullName);
        Assert.True((DateTime.UtcNow - saved.CreatedAt).TotalMinutes < 1);
    }

    [Fact] // DB-U2
    public async Task Nullable_NicAndProfilePicture_PersistAsNull()
    {
        var user = NewUser();
        user.NIC = null;
        user.ProfilePictureUrl = null;

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);

        Assert.NotNull(saved);
        Assert.Null(saved!.NIC);
        Assert.Null(saved.ProfilePictureUrl);
    }

    [Fact] // DB-U3
    public async Task Nullable_NicAndProfilePicture_PersistWithValues()
    {
        var user = NewUser();
        user.NIC = "199912345678";
        user.ProfilePictureUrl = "https://res.cloudinary.com/demo/image/upload/profile.jpg";

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);

        Assert.Equal("199912345678", saved!.NIC);
        Assert.Equal("https://res.cloudinary.com/demo/image/upload/profile.jpg", saved.ProfilePictureUrl);
    }

    #endregion

    #region NOT NULL constraints (raw SQL, so the database itself is tested)

    [Theory] // DB-U4
    [InlineData("FullName")]
    [InlineData("Email")]
    [InlineData("PhoneNumber")]
    [InlineData("PasswordHash")]
    [InlineData("Role")]
    public async Task Constraint_NullInRequiredColumn_ThrowsNotNullViolation(string nullColumn)
    {
        using var ctx = _fixture.CreateContext();

        string V(string column, string literal) => column == nullColumn ? "NULL" : literal;

        var sql =
            "INSERT INTO \"Users\" (\"Id\",\"FullName\",\"Email\",\"PhoneNumber\",\"PasswordHash\",\"Role\",\"IsActive\",\"CreatedAt\") VALUES (" +
            $"'{Guid.NewGuid()}', {V("FullName", "'Name'")}, {V("Email", $"'nn_{Guid.NewGuid()}@vsense.com'")}, " +
            $"{V("PhoneNumber", "'0771234567'")}, {V("PasswordHash", "'hash'")}, {V("Role", "'Client'")}, true, now())";

        var ex = await Assert.ThrowsAsync<PostgresException>(() => ctx.Database.ExecuteSqlRawAsync(sql));

        Assert.Equal(PostgresErrorCodes.NotNullViolation, ex.SqlState); // 23502
        Assert.Equal(nullColumn, ex.ColumnName);
    }

    #endregion

    #region Unique email behaviour

    [Fact] // DB-U5
    public async Task Constraint_BlankEmail_IsAcceptedOnce_ThenSecondBlankFails()
    {
        // Documents a gap: the database does not reject a blank email, so the API must validate it.
        // NOTE: no other test may insert a blank email, or this test will collide with it.
        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(new User { Id = Guid.NewGuid(), Email = "" });
            await ctx.SaveChangesAsync(); // accepted by the DB
        }

        using var ctx2 = _fixture.CreateContext();
        ctx2.Users.Add(new User { Id = Guid.NewGuid(), Email = "" });

        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => ctx2.SaveChangesAsync());
        var pg = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, pg.SqlState);
    }

    [Fact] // DB-U6  (EXPECTED TO FAIL today: log as a defect, see notes)
    public async Task Constraint_EmailsDifferingOnlyByCase_ShouldBeTreatedAsDuplicates()
    {
        var local = Guid.NewGuid();

        using var ctx = _fixture.CreateContext();
        ctx.Users.Add(NewUser($"Case_{local}@vsense.com"));
        await ctx.SaveChangesAsync();

        ctx.Users.Add(NewUser($"case_{local}@vsense.com"));

        await Assert.ThrowsAsync<DbUpdateException>(() => ctx.SaveChangesAsync());
    }

    [Fact] // DB-U7
    public async Task Constraint_DuplicateNic_IsNotEnforcedByDatabase()
    {
        // Documents a gap: NIC has no unique index, so two accounts can share one NIC.
        var nic = $"NIC{Guid.NewGuid():N}";
        var a = NewUser(); a.NIC = nic;
        var b = NewUser(); b.NIC = nic;

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.AddRange(a, b);
            await ctx.SaveChangesAsync();
        }

        using var verify = _fixture.CreateContext();
        Assert.Equal(2, await verify.Users.CountAsync(u => u.NIC == nic));
    }

    #endregion

    #region Update and delete

    [Fact] // DB-U8
    public async Task Update_ChangedFields_ArePersisted()
    {
        var user = NewUser();
        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        using (var ctx = _fixture.CreateContext())
        {
            var tracked = await ctx.Users.FirstAsync(u => u.Id == user.Id);
            tracked.FullName = "Updated Name";
            tracked.IsActive = false;
            tracked.PhoneNumber = "0719999999";
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);

        Assert.Equal("Updated Name", saved!.FullName);
        Assert.False(saved.IsActive);
        Assert.Equal("0719999999", saved.PhoneNumber);
    }

    [Fact] // DB-U9
    public async Task Update_EmailToExistingEmail_ThrowsUniqueViolation()
    {
        var existing = NewUser();
        var other = NewUser();

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.AddRange(existing, other);
            await ctx.SaveChangesAsync();
        }

        using var ctx2 = _fixture.CreateContext();
        var tracked = await ctx2.Users.FirstAsync(u => u.Id == other.Id);
        tracked.Email = existing.Email;

        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => ctx2.SaveChangesAsync());
        var pg = Assert.IsType<PostgresException>(ex.InnerException);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, pg.SqlState);
    }

    [Fact] // DB-U10
    public async Task Delete_User_RemovesRow()
    {
        var user = NewUser();
        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        using (var ctx = _fixture.CreateContext())
        {
            var tracked = await ctx.Users.FirstAsync(u => u.Id == user.Id);
            ctx.Users.Remove(tracked);
            await ctx.SaveChangesAsync();
        }

        Assert.Null(await Reload(user.Id));
    }

    #endregion

    #region Boundary, encoding and injection-style data

    [Fact] // DB-U11
    public async Task Boundary_VeryLongFullName_IsStoredWithoutTruncation()
    {
        // No HasMaxLength is configured, so the column is unbounded text.
        var user = NewUser();
        user.FullName = new string('A', 5000);

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);
        Assert.Equal(5000, saved!.FullName.Length);
    }

    [Fact] // DB-U12
    public async Task Encoding_UnicodeName_RoundTripsUnchanged()
    {
        var user = NewUser();
        user.FullName = "කමල් පෙරේරා / கமல் பெரேரா / Zoë O'Brien";

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);
        Assert.Equal(user.FullName, saved!.FullName);
    }

    [Fact] // DB-U13
    public async Task Security_SqlInjectionStyleInput_IsStoredLiterally_AndTableSurvives()
    {
        var user = NewUser();
        user.FullName = "Robert'); DROP TABLE \"Users\";--";

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);
        Assert.Equal(user.FullName, saved!.FullName);

        using var verify = _fixture.CreateContext();
        Assert.True(await verify.Users.CountAsync() > 0); // table still exists
    }

    [Fact] // DB-U14
    public async Task DateTime_CreatedAt_RoundTripsAsUtc()
    {
        var user = NewUser();
        user.CreatedAt = DateTime.UtcNow;

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.Add(user);
            await ctx.SaveChangesAsync();
        }

        var saved = await Reload(user.Id);

        Assert.Equal(DateTimeKind.Utc, saved!.CreatedAt.Kind);
        // Postgres stores microseconds; .NET stores 100 ns ticks
        Assert.True(Math.Abs((saved.CreatedAt - user.CreatedAt).TotalMilliseconds) < 1);
    }

    #endregion

    #region Querying

    [Fact] // DB-U15
    public async Task Query_FilterByRoleAndIsActive_ReturnsOnlyMatchingUsers()
    {
        var role = $"Role_{Guid.NewGuid():N}";

        User Make(string r, bool active)
        {
            var u = NewUser();
            u.Role = r;
            u.IsActive = active;
            return u;
        }

        using (var ctx = _fixture.CreateContext())
        {
            ctx.Users.AddRange(
                Make(role, true),
                Make(role, true),
                Make(role, false),
                Make("OtherRole", true));
            await ctx.SaveChangesAsync();
        }

        using var verify = _fixture.CreateContext();

        Assert.Equal(3, await verify.Users.CountAsync(u => u.Role == role));
        Assert.Equal(2, await verify.Users.CountAsync(u => u.Role == role && u.IsActive));
        Assert.Equal(1, await verify.Users.CountAsync(u => u.Role == role && !u.IsActive));
    }

    #endregion
}