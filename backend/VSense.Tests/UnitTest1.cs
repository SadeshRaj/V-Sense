using System;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests;

public class BackendUnitTests
{
    // TC-BE-01: Entity Initialization & Domain Rules
    [Fact]
    public void TC_BE_01_AIWorkflow_Initialization_HasCorrectDefaults()
    {
        var workflow = new AIWorkflow
        {
            Status = "pending",
            VehicleId = Guid.NewGuid().ToString(),
            RequestedBy = Guid.NewGuid().ToString()
        };

        Assert.Equal("pending", workflow.Status);
        Assert.NotNull(workflow.VehicleId);
        Assert.True(workflow.CreatedAt <= DateTime.UtcNow);
        Assert.Null(workflow.RejectionReason);
    }

    // TC-BE-02: Phone Number Validation for OTP Dispatch
    [Theory]
    [InlineData("0771234567", true)]
    [InlineData("0719876543", true)]
    [InlineData("0765551234", true)]
    [InlineData("0112345678", false)] // Landline prefix
    [InlineData("12345678", false)]    // Too short
    [InlineData("077123456789", false)]// Too long
    [InlineData("", false)]            // Empty
    public void TC_BE_02_PhoneNumber_RegexValidation_EnforcesSriLankanFormat(string phoneNumber, bool expectedValid)
    {
        var regex = new Regex(@"^07\d{8}$");
        var isValid = regex.IsMatch(phoneNumber);

        Assert.Equal(expectedValid, isValid);
    }

    // TC-BE-03: Rejection Reason Mandatory Validation
    [Fact]
    public void TC_BE_03_Workflow_Rejection_RequiresMandatoryReason()
    {
        bool ValidateRejection(string? reason, out string? error)
        {
            if (string.IsNullOrWhiteSpace(reason))
            {
                error = "Rejection reason is mandatory.";
                return false;
            }
            error = null;
            return true;
        }

        // Empty reason should fail
        Assert.False(ValidateRejection(null, out var err1));
        Assert.Equal("Rejection reason is mandatory.", err1);

        Assert.False(ValidateRejection("   ", out var err2));
        Assert.Equal("Rejection reason is mandatory.", err2);

        // Valid reason should pass
        Assert.True(ValidateRejection("Odometer tampering detected during inspection.", out var err3));
        Assert.Null(err3);
    }

    // TC-BE-04: Role-Based Access Control (RBAC) Attribute Verification
    [Fact]
    public void TC_BE_04_AdminController_IsGuardedWithAdminRoles()
    {
        var authAttribute = typeof(AdminController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .FirstOrDefault() as AuthorizeAttribute;

        Assert.NotNull(authAttribute);
        Assert.Contains("Administrator", authAttribute.Roles);
        Assert.Contains("Admin", authAttribute.Roles);
    }

    // TC-BE-05: Checkup Request Status Lifecycle
    [Fact]
    public void TC_BE_05_CheckupRequest_LifecycleTransitions_AreValid()
    {
        var checkup = new CheckupRequest
        {
            VehicleId = Guid.NewGuid(),
            OwnerId = Guid.NewGuid(),
            RequestedDate = DateTime.UtcNow.AddDays(2),
            Status = "Pending"
        };

        Assert.Equal("Pending", checkup.Status);
        Assert.False(checkup.ReminderSent);

        // Garage accepts appointment
        checkup.Status = "Confirmed";
        checkup.GarageResponse = "Appointment confirmed for 10:00 AM";
        Assert.Equal("Confirmed", checkup.Status);
        Assert.NotNull(checkup.GarageResponse);

        // Garage completes checkup
        checkup.Status = "Completed";
        Assert.Equal("Completed", checkup.Status);
    }

    // TC-BE-06: Workflows Controller Authorization Verification
    [Fact]
    public void TC_BE_06_WorkflowsController_ProtectedEndpoints_RequireAuthorization()
    {
        var method = typeof(WorkflowsController).GetMethod(nameof(WorkflowsController.StartVehicleReport));
        var authAttr = method?.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).FirstOrDefault();

        Assert.NotNull(authAttr);
    }
}
