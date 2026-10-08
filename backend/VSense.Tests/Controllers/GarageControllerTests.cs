using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using Xunit;

namespace VSense.Tests.Controllers;

public class GarageControllerTests
{
    private static ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetPartneredGarages_ReturnsOnlyActiveOrApprovedGarages()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        context.Organizations.AddRange(
            new Organization { Id = Guid.NewGuid(), Name = "Active Garage", Status = "Active" },
            new Organization { Id = Guid.NewGuid(), Name = "Approved Garage", Status = "Approved" },
            new Organization { Id = Guid.NewGuid(), Name = "Pending Garage", Status = "Pending" },
            new Organization { Id = Guid.NewGuid(), Name = "Rejected Garage", Status = "Rejected" }
        );
        await context.SaveChangesAsync();

        var controller = new GaragesController(context);

        // Act
        var result = await controller.GetPartneredGarages(null, null, 20.0);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<PartneredGarageDto>>(okResult.Value);
        Assert.Equal(2, list.Count());
        Assert.All(list, g => Assert.True(g.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) || 
                                          g.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public async Task GetPartneredGarages_WithoutUserCoordinates_ReturnsGaragesWithNullDistance()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        context.Organizations.Add(new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Colombo Garage",
            Status = "Active",
            Latitude = 6.9271m,
            Longitude = 79.8612m
        });
        await context.SaveChangesAsync();

        var controller = new GaragesController(context);

        // Act
        var result = await controller.GetPartneredGarages(null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<PartneredGarageDto>>(okResult.Value);
        var garage = Assert.Single(list);
        Assert.Null(garage.DistanceInKm);
    }

    [Fact]
    public async Task GetPartneredGarages_WithUserCoordinates_CalculatesDistanceAndSortsNearestFirst()
    {
        // Arrange
        using var context = GetInMemoryDbContext();

        // User location: Colombo
        double userLat = 6.9271;
        double userLng = 79.8612;

        // Near garage (~3 km away)
        context.Organizations.Add(new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Near Garage",
            Status = "Active",
            Latitude = 6.9000m,
            Longitude = 79.8500m
        });

        // Far garage (~15 km away)
        context.Organizations.Add(new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Far Garage",
            Status = "Active",
            Latitude = 6.8000m,
            Longitude = 79.9000m
        });

        await context.SaveChangesAsync();

        var controller = new GaragesController(context);

        // Act
        var result = await controller.GetPartneredGarages(userLat, userLng, radiusKm: 30.0);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<PartneredGarageDto>>(okResult.Value).ToList();

        Assert.Equal(2, list.Count);
        Assert.Equal("Near Garage", list[0].Name);
        Assert.Equal("Far Garage", list[1].Name);
        Assert.NotNull(list[0].DistanceInKm);
        Assert.NotNull(list[1].DistanceInKm);
        Assert.True(list[0].DistanceInKm < list[1].DistanceInKm);
    }

    [Fact]
    public async Task GetPartneredGarages_WithRadiusFilter_ExcludesGaragesOutsideRadius()
    {
        // Arrange
        using var context = GetInMemoryDbContext();

        // User location: Colombo
        double userLat = 6.9271;
        double userLng = 79.8612;

        // Garage within 10 km
        context.Organizations.Add(new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Close Garage",
            Status = "Active",
            Latitude = 6.9100m,
            Longitude = 79.8700m
        });

        // Garage ~115 km away (Kandy)
        context.Organizations.Add(new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Far Away Garage",
            Status = "Active",
            Latitude = 7.2906m,
            Longitude = 80.6337m
        });

        await context.SaveChangesAsync();

        var controller = new GaragesController(context);

        // Act - Request within 10 km radius
        var result = await controller.GetPartneredGarages(userLat, userLng, radiusKm: 10.0);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<PartneredGarageDto>>(okResult.Value);
        var singleGarage = Assert.Single(list);
        Assert.Equal("Close Garage", singleGarage.Name);
    }

    [Fact]
    public async Task GetPartneredGarages_WhenNoActiveGaragesExist_ReturnsEmptyList()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var controller = new GaragesController(context);

        // Act
        var result = await controller.GetPartneredGarages(null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<PartneredGarageDto>>(okResult.Value);
        Assert.Empty(list);
    }
}