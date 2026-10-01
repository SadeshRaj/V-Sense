using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Controllers;

public class CheckupRequestsControllerTests
    : IClassFixture<CustomWebApplicationFactory>
{
    private const string BaseUrl = "/api/CheckupRequests";
    private const string GarageRole = "Garage";
    private const string OwnerRole = "VehicleOwner";

    private readonly CustomWebApplicationFactory _factory;

    public CheckupRequestsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ───────────────────────── Helpers ─────────────────────────

    private async Task<Guid> SeedOrganizationAsync(string status = "Active")
    {
        var id = Guid.NewGuid();
        await _factory.ExecuteDbAsync(async db =>
        {
            db.Organizations.Add(new Organization
            {
                Id = id,
                Name = $"Test Garage {id:N}",
                Status = status
            });
            await db.SaveChangesAsync();
        });
        return id;
    }

    private async Task SeedVehicleOwnershipAsync(Guid ownerId, Guid vehicleId, string status = "Active")
    {
        await _factory.ExecuteDbAsync(async db =>
        {
            db.VehicleOwnerships.Add(new VehicleOwnership
            {
                UserId = ownerId,
                VehicleId = vehicleId,
                Status = status
            });
            await db.SaveChangesAsync();
        });
    }

    private async Task<Guid> SeedRequestAsync(
        Guid organizationId, Guid ownerId, Action<CheckupRequest>? customize = null)
    {
        var request = new CheckupRequest
        {
            Id = Guid.NewGuid(),
            VehicleId = Guid.NewGuid(),
            OwnerId = ownerId,
            OrganizationId = organizationId,
            RequestedDate = DateTime.UtcNow.Date.AddDays(2),
            RequestedTime = DateTime.UtcNow.Date.AddDays(2).AddHours(10),
            OwnerMessage = "Please check the brakes.",
            Status = CheckupRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        customize?.Invoke(request);

        await _factory.ExecuteDbAsync(async db =>
        {
            db.CheckupRequests.Add(request);
            await db.SaveChangesAsync();
        });

        return request.Id;
    }

    private Task<CheckupRequest?> GetRequestAsync(Guid id) =>
        _factory.QueryDbAsync(db =>
            db.CheckupRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id));

    private static object NewCreateBody(Guid vehicleId, Guid organizationId) => new
    {
        vehicleId,
        organizationId,
        requestedDate = DateTime.UtcNow.Date.AddDays(3),
        requestedTime = DateTime.UtcNow.Date.AddDays(3).AddHours(10),
        ownerMessage = "Strange noise from the engine."
    };

    // ═════════════ GET /organization-requests ═════════════

    [Fact]
    public async Task GetOrganizationRequests_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"{BaseUrl}/organization-requests");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetOrganizationRequests_AsOwnerRole_Returns403Forbidden()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid(), OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/organization-requests");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetOrganizationRequests_WithInvalidUserIdClaim_Returns401Unauthorized()
    {
        var client = _factory.CreateAuthenticatedClient("not-a-guid", GarageRole);

        var response = await client.GetAsync($"{BaseUrl}/organization-requests");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("Garage")]
    [InlineData("ServiceCenter")]
    public async Task GetOrganizationRequests_AsGarageOrServiceCenter_ReturnsOnlyOwnRequests(string role)
    {
        var orgId = await SeedOrganizationAsync();
        var otherOrgId = await SeedOrganizationAsync();
        var ownerId = Guid.NewGuid();

        var mine1 = await SeedRequestAsync(orgId, ownerId);
        var mine2 = await SeedRequestAsync(orgId, ownerId);
        var theirs = await SeedRequestAsync(otherOrgId, ownerId);

        var client = _factory.CreateAuthenticatedClient(orgId, role);

        var response = await client.GetAsync($"{BaseUrl}/organization-requests");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        json.RootElement.GetArrayLength().Should().Be(2);
        body.Should().Contain(mine1.ToString()).And.Contain(mine2.ToString());
        body.Should().NotContain(theirs.ToString());
    }

    [Fact]
    public async Task GetOrganizationRequests_WhenNoRequests_ReturnsEmptyList()
    {
        var orgId = await SeedOrganizationAsync();
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.GetAsync($"{BaseUrl}/organization-requests");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        json.RootElement.GetArrayLength().Should().Be(0);
    }

    // ═════════════ PUT /{id}/accept ═════════════

    [Fact]
    public async Task AcceptRequest_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PutAsync($"{BaseUrl}/{Guid.NewGuid()}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AcceptRequest_AsOwnerRole_Returns403Forbidden()
    {
        var orgId = await SeedOrganizationAsync();
        var ownerId = Guid.NewGuid();
        var requestId = await SeedRequestAsync(orgId, ownerId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PutAsync($"{BaseUrl}/{requestId}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await GetRequestAsync(requestId))!.Status.Should().Be(CheckupRequestStatus.Pending);
    }

    [Fact]
    public async Task AcceptRequest_WhenPending_ConfirmsRequest()
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsync($"{BaseUrl}/{requestId}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await GetRequestAsync(requestId);
        saved!.Status.Should().Be(CheckupRequestStatus.Confirmed);
    }

    [Fact]
    public async Task AcceptRequest_WhenAlreadyConfirmed_Returns400BadRequest()
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid(),
            r => r.Status = CheckupRequestStatus.Confirmed);
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsync($"{BaseUrl}/{requestId}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AcceptRequest_WhenRequestDoesNotExist_Returns404NotFound()
    {
        var orgId = await SeedOrganizationAsync();
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsync($"{BaseUrl}/{Guid.NewGuid()}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AcceptRequest_ForAnotherOrganization_Returns404AndLeavesRequestUnchanged()
    {
        var ownerOrgId = await SeedOrganizationAsync();
        var otherOrgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(ownerOrgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(otherOrgId, GarageRole);

        var response = await client.PutAsync($"{BaseUrl}/{requestId}/accept", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await GetRequestAsync(requestId))!.Status.Should().Be(CheckupRequestStatus.Pending);
    }

    // ═════════════ PUT /{id}/suggest-alternative ═════════════

    [Fact]
    public async Task SuggestAlternative_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/suggest-alternative",
            new { garageResponse = "How about Friday?" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SuggestAlternative_AsOwnerRole_Returns403Forbidden()
    {
        var orgId = await SeedOrganizationAsync();
        var ownerId = Guid.NewGuid();
        var requestId = await SeedRequestAsync(orgId, ownerId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{requestId}/suggest-alternative",
            new { garageResponse = "How about Friday?" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SuggestAlternative_WhenPending_SavesTrimmedResponseAndUpdatesStatus()
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{requestId}/suggest-alternative",
            new { garageResponse = "  We are free on Friday at 2pm.  " });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await GetRequestAsync(requestId);
        saved!.Status.Should().Be(CheckupRequestStatus.AlternativeSuggested);
        saved.GarageResponse.Should().Be("We are free on Friday at 2pm.");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SuggestAlternative_WithEmptyResponse_Returns400AndLeavesRequestPending(string garageResponse)
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{requestId}/suggest-alternative",
            new { garageResponse });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await GetRequestAsync(requestId))!.Status.Should().Be(CheckupRequestStatus.Pending);
    }

    [Fact]
    public async Task SuggestAlternative_WhenNotPending_Returns400BadRequest()
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid(),
            r => r.Status = CheckupRequestStatus.Confirmed);
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{requestId}/suggest-alternative",
            new { garageResponse = "How about Friday?" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await GetRequestAsync(requestId))!.Status.Should().Be(CheckupRequestStatus.Confirmed);
    }

    [Fact]
    public async Task SuggestAlternative_WhenRequestDoesNotExist_Returns404NotFound()
    {
        var orgId = await SeedOrganizationAsync();
        var client = _factory.CreateAuthenticatedClient(orgId, GarageRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/suggest-alternative",
            new { garageResponse = "How about Friday?" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SuggestAlternative_ForAnotherOrganization_Returns404NotFound()
    {
        var ownerOrgId = await SeedOrganizationAsync();
        var otherOrgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(ownerOrgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(otherOrgId, GarageRole);

        var response = await client.PutAsJsonAsync(
            $"{BaseUrl}/{requestId}/suggest-alternative",
            new { garageResponse = "How about Friday?" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await GetRequestAsync(requestId))!.Status.Should().Be(CheckupRequestStatus.Pending);
    }

    // ═════════════ POST (create) ═════════════

    [Fact]
    public async Task CreateRequest_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            BaseUrl, NewCreateBody(Guid.NewGuid(), Guid.NewGuid()));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("Active")]
    [InlineData("Approved")]
    [InlineData("APPROVED")]
    public async Task CreateRequest_WithValidVehicleAndAvailableGarage_Returns201AndSavesPendingRequest(string garageStatus)
    {
        var ownerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        var orgId = await SeedOrganizationAsync(garageStatus);
        await SeedVehicleOwnershipAsync(ownerId, vehicleId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PostAsJsonAsync(BaseUrl, NewCreateBody(vehicleId, orgId));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var saved = await _factory.QueryDbAsync(db =>
            db.CheckupRequests.AsNoTracking()
                .FirstOrDefaultAsync(r => r.VehicleId == vehicleId && r.OrganizationId == orgId));
        saved.Should().NotBeNull();
        saved!.OwnerId.Should().Be(ownerId);
        saved.Status.Should().Be(CheckupRequestStatus.Pending);
        saved.OwnerMessage.Should().Be("Strange noise from the engine.");
    }

    [Fact]
    public async Task CreateRequest_WhenVehicleNotOwnedByUser_Returns400BadRequest()
    {
        var orgId = await SeedOrganizationAsync();
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid(), OwnerRole);

        var response = await client.PostAsJsonAsync(
            BaseUrl, NewCreateBody(Guid.NewGuid(), orgId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateRequest_WhenVehicleOwnershipIsNotActive_Returns400BadRequest()
    {
        var ownerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        var orgId = await SeedOrganizationAsync();
        await SeedVehicleOwnershipAsync(ownerId, vehicleId, status: "Transferred");
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PostAsJsonAsync(BaseUrl, NewCreateBody(vehicleId, orgId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateRequest_WhenGarageDoesNotExist_Returns400BadRequest()
    {
        var ownerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        await SeedVehicleOwnershipAsync(ownerId, vehicleId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PostAsJsonAsync(
            BaseUrl, NewCreateBody(vehicleId, Guid.NewGuid()));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Suspended")]
    [InlineData("Rejected")]
    public async Task CreateRequest_WhenGarageIsNotActiveOrApproved_Returns400BadRequest(string garageStatus)
    {
        var ownerId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        var orgId = await SeedOrganizationAsync(garageStatus);
        await SeedVehicleOwnershipAsync(ownerId, vehicleId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.PostAsJsonAsync(BaseUrl, NewCreateBody(vehicleId, orgId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ═════════════ GET /my-requests ═════════════

    [Fact]
    public async Task GetMyRequests_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"{BaseUrl}/my-requests");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyRequests_WithInvalidUserIdClaim_Returns401Unauthorized()
    {
        var client = _factory.CreateAuthenticatedClient("not-a-guid", OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/my-requests");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyRequests_ReturnsOnlyRequestsOwnedByCurrentUser()
    {
        var orgId = await SeedOrganizationAsync();
        var ownerA = Guid.NewGuid();
        var ownerB = Guid.NewGuid();

        var a1 = await SeedRequestAsync(orgId, ownerA);
        var a2 = await SeedRequestAsync(orgId, ownerA);
        var b1 = await SeedRequestAsync(orgId, ownerB);

        var client = _factory.CreateAuthenticatedClient(ownerA, OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/my-requests");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        json.RootElement.GetArrayLength().Should().Be(2);
        body.Should().Contain(a1.ToString()).And.Contain(a2.ToString());
        body.Should().NotContain(b1.ToString());
    }

    // ═════════════ GET /{id} ═════════════

    [Fact]
    public async Task GetRequestById_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetRequestById_ForOwnRequest_Returns200()
    {
        var orgId = await SeedOrganizationAsync();
        var ownerId = Guid.NewGuid();
        var requestId = await SeedRequestAsync(orgId, ownerId);
        var client = _factory.CreateAuthenticatedClient(ownerId, OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/{requestId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Contain(requestId.ToString());
    }

    [Fact]
    public async Task GetRequestById_ForAnotherOwnersRequest_Returns404NotFound()
    {
        var orgId = await SeedOrganizationAsync();
        var requestId = await SeedRequestAsync(orgId, Guid.NewGuid());
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid(), OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/{requestId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetRequestById_WhenRequestDoesNotExist_Returns404NotFound()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid(), OwnerRole);

        var response = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}