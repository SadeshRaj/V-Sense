using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace VSense.Tests.Controllers;

public class CheckupRequestsControllerTests
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CheckupRequestsControllerTests(
        WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetOrganizationRequests_WithoutToken_Returns401Unauthorized()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync(
            "/api/CheckupRequests/organization-requests");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}