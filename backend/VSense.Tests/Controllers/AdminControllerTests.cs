using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;
using Xunit;

namespace VSense.Tests.Controllers;

public class AdminControllerTests
{
    private readonly Mock<IEmailService> _mockEmailService;

    public AdminControllerTests()
    {
        _mockEmailService = new Mock<IEmailService>();
    }

    private static ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    // ─── GET /api/Admin/assigned-vehicles ───────────────────────────────────

    [Fact]
    public async Task GetAssignedVehicles_ReturnsOkResult_WithListOfVehicles()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var vehicle = new Vehicle { Id = Guid.NewGuid(), RegistrationNumber = "CAB-1234", Make = "Toyota", Model = "Corolla" };
        var user = new User { Id = Guid.NewGuid(), FullName = "John Doe", Email = "john@example.com" };
        var payment = new Payment { Id = Guid.NewGuid(), Amount = 5000, TrasactionId = "TXN123" };

        context.VehicleOwnerships.Add(new VehicleOwnership
        {
            Id = Guid.NewGuid(),
            VehicleId = vehicle.Id,
            Vehicle = vehicle,
            User = user,
            Payment = payment,
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.GetAssignedVehicles();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
        Assert.Single(list);
    }

    // ─── GET /api/Admin/registrations/all ───────────────────────────────────

    [Fact]
    public async Task GetAllRegistrations_ReturnsOkResult_WithAllOrganizations()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        context.Organizations.AddRange(
            new Organization { Id = Guid.NewGuid(), Name = "Garage A", Status = "Pending", CreatedAt = DateTime.UtcNow },
            new Organization { Id = Guid.NewGuid(), Name = "Garage B", Status = "Active", CreatedAt = DateTime.UtcNow.AddMinutes(-5) }
        );
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.GetAllRegistrations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
        Assert.Equal(2, list.Count());
    }

    // ─── GET /api/Admin/registrations/pending ───────────────────────────────

    [Fact]
    public async Task GetPendingRegistrations_ReturnsOkResult_WithOnlyPendingOrganizations()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        context.Organizations.AddRange(
            new Organization { Id = Guid.NewGuid(), Name = "Garage Pending", Status = "Pending", CreatedAt = DateTime.UtcNow },
            new Organization { Id = Guid.NewGuid(), Name = "Garage Active", Status = "Active", CreatedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.GetPendingRegistrations();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
        Assert.Single(list);
    }

    // ─── PUT /api/Admin/registrations/{id}/approve ──────────────────────────

    [Fact]
    public async Task Approve_ReturnsNotFound_WhenOrganizationDoesNotExist()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Approve(Guid.NewGuid());

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Approve_ReturnsBadRequest_WhenOrganizationIsAlreadyApproved()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var orgId = Guid.NewGuid();
        context.Organizations.Add(new Organization { Id = orgId, Name = "Already Active Garage", Status = "Active" });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Approve(orgId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Approve_ReturnsOkResult_AndUpdatesStatusToActive()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var orgId = Guid.NewGuid();
        context.Organizations.Add(new Organization
        {
            Id = orgId,
            Name = "Pending Garage",
            Email = "garage@test.com",
            ContactPersonName = "Owner",
            Status = "Pending"
        });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Approve(orgId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.IsType<ApprovalActionResponseDto>(okResult.Value);

        var updatedOrg = await context.Organizations.FindAsync(orgId);
        Assert.NotNull(updatedOrg);
        Assert.Equal("Active", updatedOrg.Status);
    }

    // ─── PUT /api/Admin/registrations/{id}/reject ───────────────────────────

    [Fact]
    public async Task Reject_ReturnsNotFound_WhenOrganizationDoesNotExist()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Reject(Guid.NewGuid());

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Reject_ReturnsOkResult_AndUpdatesStatusToRejected()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var orgId = Guid.NewGuid();
        context.Organizations.Add(new Organization
        {
            Id = orgId,
            Name = "Garage To Reject",
            Email = "reject@test.com",
            Status = "Pending"
        });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Reject(orgId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.IsType<ApprovalActionResponseDto>(okResult.Value);

        var updatedOrg = await context.Organizations.FindAsync(orgId);
        Assert.NotNull(updatedOrg);
        Assert.Equal("Rejected", updatedOrg.Status);
    }

    // ─── DELETE /api/Admin/registrations/{id} ───────────────────────────────

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenOrganizationDoesNotExist()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Delete(Guid.NewGuid());

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsBadRequest_WhenOrganizationHasServiceRecords()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var orgId = Guid.NewGuid();
        context.Organizations.Add(new Organization { Id = orgId, Name = "Garage With Records" });
        context.ServiceRecords.Add(new ServiceRecord { Id = Guid.NewGuid(), GarageId = orgId });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Delete(orgId);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Delete_ReturnsOkResult_WhenOrganizationIsDeletedSuccessfully()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var orgId = Guid.NewGuid();
        context.Organizations.Add(new Organization { Id = orgId, Name = "Clean Garage" });
        await context.SaveChangesAsync();

        var controller = new AdminController(context, _mockEmailService.Object);

        // Act
        var result = await controller.Delete(orgId);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var deletedOrg = await context.Organizations.FindAsync(orgId);
        Assert.Null(deletedOrg);
    }
}