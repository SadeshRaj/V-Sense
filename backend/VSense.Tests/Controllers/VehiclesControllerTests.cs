using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Controllers;

public class VehiclesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string BaseUrl = "/api/Vehicles";
    private readonly CustomWebApplicationFactory _factory;

    public VehiclesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ───────────────────────── Helpers ─────────────────────────

    private async Task<Vehicle> SeedVehicleAsync(
        string regNum = "WP CAQ-5834",
        string? chassis = null,
        string? license = null,
        string? vin = null)
    {
        var id = Guid.NewGuid();

        var vehicle = new Vehicle
        {
            Id = id,
            RegistrationNumber = regNum,
            ChassisNumber = chassis ?? $"CH-{id:N}",
            LicenseNumber = license ?? $"LIC-{id:N}",
            VIN = vin ?? $"VIN-{id:N}",
            Make = "Toyota",
            Model = "Prius",
            ManufacturingYear = 2020,
            FuelType = "Hybrid",
            Type = "Car"
        };

        await _factory.ExecuteDbAsync(async db =>
        {
            db.Vehicles.Add(vehicle);
            await db.SaveChangesAsync();
        });

        return vehicle;
    }

    private async Task<VehicleOwnership> SeedOwnershipAsync(Guid userId, Guid vehicleId, string status = "Active")
    {
        var ownership = new VehicleOwnership
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            VehicleId = vehicleId,
            Status = status,
            VerifiedAt = DateTime.UtcNow
        };

        await _factory.ExecuteDbAsync(async db =>
        {
            db.VehicleOwnerships.Add(ownership);
            await db.SaveChangesAsync();
        });

        return ownership;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POST /api/Vehicles/verify-lookup
    // ═════════════════════════════════════════════════════════════════════════

    [Theory]
    [InlineData("", "CH-123", "LIC-123")]
    [InlineData("WP-123", "", "LIC-123")]
    [InlineData("WP-123", "CH-123", "")]
    [InlineData("   ", "CH-123", "LIC-123")]
    [InlineData(null, "CH-123", "LIC-123")]
    public async Task VerifyLookup_WhenAnyFieldIsMissingOrWhitespace_Returns400BadRequest(
        string? reg, string? chassis, string? license)
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var payload = new VerifyLookupRequestDto
        {
            RegistrationNumber = reg!,
            ChassisNumber = chassis!,
            LicenseNumber = license!
        };

        var response = await client.PostAsJsonAsync($"{BaseUrl}/verify-lookup", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task VerifyLookup_WhenNoMatchingVehicleInDatabase_Returns404NotFound()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var payload = new VerifyLookupRequestDto
        {
            RegistrationNumber = "NON-EXISTENT",
            ChassisNumber = "CH-000000",
            LicenseNumber = "LIC-000000"
        };

        var response = await client.PostAsJsonAsync($"{BaseUrl}/verify-lookup", payload);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task VerifyLookup_WhenChassisOrLicenseMismatched_Returns404NotFound()
    {
        await SeedVehicleAsync("WP CAB-1111", chassis: "CH-CORRECT", license: "LIC-CORRECT");
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var payload = new VerifyLookupRequestDto
        {
            RegistrationNumber = "WP CAB-1111",
            ChassisNumber = "CH-WRONG",
            LicenseNumber = "LIC-CORRECT"
        };

        var response = await client.PostAsJsonAsync($"{BaseUrl}/verify-lookup", payload);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task VerifyLookup_IgnoresCasingAndLeadingTrailingWhitespace_Returns200OK()
    {
        var vehicle = await SeedVehicleAsync("wp cab-2222", chassis: "ch-99999", license: "lic-88888");
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var payload = new VerifyLookupRequestDto
        {
            RegistrationNumber = "  WP CAB-2222  ",
            ChassisNumber = " CH-99999 ",
            LicenseNumber = " LiC-88888 "
        };

        var response = await client.PostAsJsonAsync($"{BaseUrl}/verify-lookup", payload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;

        root.GetProperty("id").GetGuid().Should().Be(vehicle.Id);
        root.GetProperty("registrationNumber").GetString().Should().Be("wp cab-2222");
        root.GetProperty("make").GetString().Should().Be("Toyota");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/Vehicles/my-vehicles
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetMyVehicles_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"{BaseUrl}/my-vehicles");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyVehicles_WithMalformedAuthorizationHeader_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme", "invalid-guid-string");

        var response = await client.GetAsync($"{BaseUrl}/my-vehicles");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyVehicles_WhenUserHasNoVehicles_Returns200OKWithEmptyList()
    {
        var userId = Guid.NewGuid();
        var client = _factory.CreateAuthenticatedClient(userId);

        var response = await client.GetAsync($"{BaseUrl}/my-vehicles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        json.RootElement.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task GetMyVehicles_FiltersByUserIdAndActiveStatusOnly()
    {
        var currentUserId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var activeVehicle = await SeedVehicleAsync("WP ACTIVE-1");
        var inactiveVehicle = await SeedVehicleAsync("WP INACTIVE-2");
        var otherUserVehicle = await SeedVehicleAsync("WP OTHER-3");

        await SeedOwnershipAsync(currentUserId, activeVehicle.Id, status: "Active");
        await SeedOwnershipAsync(currentUserId, inactiveVehicle.Id, status: "Inactive");
        await SeedOwnershipAsync(otherUserId, otherUserVehicle.Id, status: "Active");

        var client = _factory.CreateAuthenticatedClient(currentUserId);

        var response = await client.GetAsync($"{BaseUrl}/my-vehicles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();

        body.Should().Contain("WP ACTIVE-1");
        body.Should().NotContain("WP INACTIVE-2");
        body.Should().NotContain("WP OTHER-3");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DELETE /api/Vehicles/my-vehicles/{vehicleId}
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task RemoveMyVehicle_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync($"{BaseUrl}/my-vehicles/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RemoveMyVehicle_WhenOwnershipDoesNotExist_Returns404NotFound()
    {
        var userId = Guid.NewGuid();
        var vehicle = await SeedVehicleAsync("WP CAD-9090");

        var client = _factory.CreateAuthenticatedClient(userId);

        var response = await client.DeleteAsync($"{BaseUrl}/my-vehicles/{vehicle.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RemoveMyVehicle_WhenOwnedByAnotherUser_Returns404NotFound()
    {
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();

        var vehicle = await SeedVehicleAsync("WP CAD-9090");
        await SeedOwnershipAsync(ownerId, vehicle.Id);

        var client = _factory.CreateAuthenticatedClient(attackerId);

        var response = await client.DeleteAsync($"{BaseUrl}/my-vehicles/{vehicle.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var ownershipStillExists = await _factory.QueryDbAsync(db =>
            db.VehicleOwnerships.AnyAsync(vo => vo.VehicleId == vehicle.Id && vo.UserId == ownerId));

        ownershipStillExists.Should().BeTrue();
    }

    [Fact]
    public async Task RemoveMyVehicle_WhenValid_RemovesOwnershipFromDatabaseAndReturns200OK()
    {
        var userId = Guid.NewGuid();
        var vehicle = await SeedVehicleAsync("WP CAD-9090");
        var ownership = await SeedOwnershipAsync(userId, vehicle.Id);

        var client = _factory.CreateAuthenticatedClient(userId);

        var response = await client.DeleteAsync($"{BaseUrl}/my-vehicles/{vehicle.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var dbOwnership = await _factory.QueryDbAsync(db =>
            db.VehicleOwnerships.FirstOrDefaultAsync(vo => vo.Id == ownership.Id));

        dbOwnership.Should().BeNull();

        var dbVehicle = await _factory.QueryDbAsync(db =>
            db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicle.Id));

        dbVehicle.Should().NotBeNull();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/Vehicles/search
    // ═════════════════════════════════════════════════════════════════════════

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData("   ", "   ")]
    public async Task Search_WhenBothParametersAreMissingOrWhitespace_Returns400BadRequest(
        string? vehicleNum, string? chassisNum)
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?vehicleNumber={vehicleNum}&chassisNumber={chassisNum}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("WP CAQ-1001", "WP CAQ-1001")]
    [InlineData("WP CAQ-1002", "wp caq 1002")]
    [InlineData("WP CAQ-1003", "WP-CAQ-1003")]
    [InlineData("WP CAQ-1004", "  wpcaq1004  ")]
    public async Task Search_ByVehicleNumber_StripsSpacesHyphensAndCasing_Returns200OK(string regNum, string searchInput)
    {
        var vehicle = await SeedVehicleAsync(regNum);
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?vehicleNumber={Uri.EscapeDataString(searchInput)}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<VehicleDto>();
        result.Should().NotBeNull();
        result!.Id.Should().Be(vehicle.Id);
        result.RegistrationNumber.Should().Be(regNum);
    }

    [Fact]
    public async Task Search_ByVehicleNumber_WhenNotFound_Returns404NotFound()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?vehicleNumber=NON-EXISTENT-NUM");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Search_ByChassisNumber_MatchesChassisNumber_Returns200OK()
    {
        var vehicle = await SeedVehicleAsync(chassis: "CH-ABC-9999");
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?chassisNumber=ch-abc-9999");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<VehicleDto>();
        result.Should().NotBeNull();
        result!.ChassisNumber.Should().Be("CH-ABC-9999");
    }

    [Fact]
    public async Task Search_ByChassisNumber_MatchesVIN_WhenChassisIsDifferent_Returns200OK()
    {
        var vehicle = await SeedVehicleAsync(chassis: "CH-DIFFERENT-999", vin: "VIN-MATCH-777");
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?chassisNumber=vin-match-777");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<VehicleDto>();
        result.Should().NotBeNull();
        result!.Id.Should().Be(vehicle.Id);
        result.ChassisNumber.Should().Be("CH-DIFFERENT-999");
    }

    [Fact]
    public async Task Search_ByChassisNumber_WhenNotFound_Returns404NotFound()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?chassisNumber=UNKNOWN-CHASSIS");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Search_WhenBothProvided_PrioritizesVehicleNumberSearch()
    {
        var vehicleA = await SeedVehicleAsync("WP REG-100", chassis: "CH-100");
        var vehicleB = await SeedVehicleAsync("WP REG-200", chassis: "CH-200");

        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/search?vehicleNumber=WPREG100&chassisNumber=CH-200");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<VehicleDto>();
        result.Should().NotBeNull();
        result!.Id.Should().Be(vehicleA.Id);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // AUDIT & VULNERABILITY FINDING TESTS (EXPECTED TO FAIL)
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task VULN_001_VerifyLookup_EnforcesRateLimiting_OnBruteForceAttempts()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());
        var payload = new VerifyLookupRequestDto
        {
            RegistrationNumber = "WP BRUTE-001",
            ChassisNumber = "CH-000000",
            LicenseNumber = "LIC-000000"
        };

        HttpResponseMessage lastResponse = null!;
        for (int i = 0; i < 15; i++)
        {
            lastResponse = await client.PostAsJsonAsync($"{BaseUrl}/verify-lookup", payload);
        }

        
        lastResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests,
            "sensitive verification endpoints should rate-limit excessive brute-force attempts");
    }

    [Fact]
    public async Task VULN_002_Search_RejectsExcessivelyLongQueries_WithBadRequest()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());
        string oversizedVehicleNum = new string('X', 5000);

        var response = await client.GetAsync($"{BaseUrl}/search?vehicleNumber={oversizedVehicleNum}");

        
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "search endpoint should validate query parameter length before executing database queries");
    }
}