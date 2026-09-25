// VSense.API/Controllers/WorkflowsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;

namespace VSense.API.Controllers;

[ApiController]
[Route("api/workflows")]
public class WorkflowsController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public WorkflowsController(IHttpClientFactory httpClientFactory, ApplicationDbContext context, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _httpClient.BaseAddress = new Uri("http://localhost:8000/");
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("vehicle-report")]
    [Authorize]
    public async Task<IActionResult> StartVehicleReport([FromBody] ReportRequestDto request)
    {
        var aiResponse = await _httpClient.PostAsJsonAsync("api/workflows/start", request);

        if (aiResponse.IsSuccessStatusCode)
        {
            var result = await aiResponse.Content.ReadFromJsonAsync<object>();
            return Ok(result);
        }

        return StatusCode(500, "Failed to start AI workflow. Ensure the Python API is running.");
    }

    [HttpGet("my-workflows/{vehicleId}")]
    [Authorize]
    public async Task<IActionResult> GetMyWorkflows(string vehicleId)
    {
        var workflows = await _context.Set<AIWorkflow>()
            .Where(w => w.VehicleId == vehicleId)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new {
                id = w.Id,
                status = w.Status,
                createdAt = w.CreatedAt
            })
            .ToListAsync();

        return Ok(workflows);
    }

    [HttpGet("logs")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetAllWorkflowLogs()
    {
        var workflows = await _context.Set<AIWorkflow>()
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        var vehicleIds = workflows.Where(w => !string.IsNullOrEmpty(w.VehicleId))
                                  .Select(w => Guid.Parse(w.VehicleId!))
                                  .Distinct().ToList();

        var vehicles = await _context.Vehicles
            .Where(v => vehicleIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id.ToString(), v => v.RegistrationNumber);

        var result = workflows.Select(w => new {
            id = w.Id,
            status = w.Status,
            createdAt = w.CreatedAt,
            vehicleId = w.VehicleId,
            vehicleReg = !string.IsNullOrEmpty(w.VehicleId) && vehicles.ContainsKey(w.VehicleId)
                            ? vehicles[w.VehicleId] : "N/A",
            aiInsight = w.AiInsight,
            fraudFlags = w.FraudFlags,
            historySummary = w.HistorySummary
        });

        return Ok(result);
    }

    [HttpGet("pending-approval")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        var pendingWorkflows = await _context.Set<AIWorkflow>()
            .Where(w => w.Status == "pending_approval")
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        var vehicleIds = pendingWorkflows.Where(w => !string.IsNullOrEmpty(w.VehicleId))
                                         .Select(w => Guid.Parse(w.VehicleId!))
                                         .Distinct().ToList();

        var vehicles = await _context.Vehicles
            .Where(v => vehicleIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id.ToString(), v => v.RegistrationNumber);

        var result = pendingWorkflows.Select(w => new {
            id = w.Id,
            status = w.Status,
            createdAt = w.CreatedAt,
            vehicleId = w.VehicleId,
            vehicleReg = !string.IsNullOrEmpty(w.VehicleId) && vehicles.ContainsKey(w.VehicleId)
                            ? vehicles[w.VehicleId] : "N/A"
        });

        return Ok(result);
    }

    [HttpGet("{id}/status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetWorkflowStatus(Guid id)
    {
        var workflow = await _context.Set<AIWorkflow>().FindAsync(id);
        if (workflow == null) return NotFound(new { message = "Workflow not found." });

        return Ok(new {
            workflowId = workflow.Id,
            status = workflow.Status,
            aiInsight = workflow.AiInsight
        });
    }

    [HttpGet("{id}/details")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetWorkflowDetails(Guid id)
    {
        var workflow = await _context.Set<AIWorkflow>().FindAsync(id);
        if (workflow == null) return NotFound(new { message = "Workflow not found." });

        return Ok(new {
            workflowId = workflow.Id,
            status = workflow.Status,
            aiInsight = workflow.AiInsight,
            fraudFlags = string.IsNullOrEmpty(workflow.FraudFlags) ? "[]" : workflow.FraudFlags,
            historySummary = string.IsNullOrEmpty(workflow.HistorySummary) ? "{}" : workflow.HistorySummary
        });
    }

    [HttpGet("report-data/{vehicleId}")]
    [Authorize]
    public async Task<IActionResult> GetReportData(Guid vehicleId)
    {
        var vehicle = await _context.Vehicles.FindAsync(vehicleId);
        if (vehicle == null) return NotFound("Vehicle not found");

        var serviceRecords = await _context.ServiceRecords
            .Include(s => s.Organization)
            .Where(s => s.VehicleId == vehicleId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new {
                s.Id,
                s.Title,
                s.Description,
                s.OdometerReading,
                s.CreatedAt,
                GarageName = s.Organization != null ? s.Organization.Name : "Independent Garage",
                GarageVerified = s.Organization != null && s.Organization.IsVerified == true
            })
            .ToListAsync();

        var vehicleHistory = await _context.VehicleHistories
            .FirstOrDefaultAsync(vh => vh.VehicleId == vehicleId);

        var ownershipHistory = await _context.VehicleOwnershipHistories
            .Where(o => o.VehicleId == vehicleId)
            .OrderByDescending(o => o.OwnershipStartDate)
            .Select(o => new {
                o.OwnerName,
                o.OwnershipStartDate,
                o.OwnershipEndDate
            })
            .ToListAsync();

        // NEW: Fetch Police & Accident Records
        var policeRecords = await _context.VehiclePoliceRecords
            .Where(p => p.VehicleId == vehicleId)
            .OrderByDescending(p => p.IncidentDate)
            .Select(p => new {
                p.IncidentDate,
                p.IncidentType,
                p.Description,
                p.Severity,
                p.PoliceStation
            })
            .ToListAsync();

        return Ok(new {
            vehicle = new {
                vehicle.Id,
                vehicle.Make,
                vehicle.Model,
                vehicle.RegistrationNumber,
                vehicle.VIN,
                vehicle.ManufacturingYear,
                vehicle.FuelType
            },
            records = serviceRecords,
            legalStatus = vehicleHistory,
            pastOwners = ownershipHistory,
            policeRecords = policeRecords
        });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ApproveWorkflow(Guid id, [FromBody] ApproveWorkflowDto request)
    {
        var workflow = await _context.Set<AIWorkflow>().FindAsync(id);
        if (workflow == null) return NotFound("Workflow not found.");

        if (workflow.Status != "pending_approval")
            return BadRequest("Workflow is not pending approval.");

        workflow.Status = "completed";
        await _context.SaveChangesAsync();

        var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
        var qrVerificationUrl = $"{frontendUrl.TrimEnd('/')}/verify/{workflow.Id}";

        return Ok(new {
            message = "Report approved and finalized.",
            workflowId = workflow.Id,
            qrPayload = qrVerificationUrl
        });
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> RejectWorkflow(Guid id, [FromBody] ApproveWorkflowDto request)
    {
        var workflow = await _context.Set<AIWorkflow>().FindAsync(id);
        if (workflow == null) return NotFound("Workflow not found.");

        workflow.Status = "failed";
        await _context.SaveChangesAsync();

        return Ok(new { message = "Report rejected safely. User will be notified." });
    }

    [HttpGet("verify/{workflowId}")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyCertificate(Guid workflowId)
    {
        var workflow = await _context.Set<AIWorkflow>().FindAsync(workflowId);

        if (workflow == null || workflow.Status != "completed")
        {
            return BadRequest(new { valid = false, message = "Invalid, pending, or rejected certificate." });
        }

        object vehicleData = null;
        object serviceRecords = null;
        object policeRecords = null;

        if (!string.IsNullOrEmpty(workflow.VehicleId) && Guid.TryParse(workflow.VehicleId, out Guid vId))
        {
            var vehicle = await _context.Vehicles.FindAsync(vId);
            if (vehicle != null)
            {
                vehicleData = new {
                    make = vehicle.Make,
                    model = vehicle.Model,
                    year = vehicle.ManufacturingYear,
                    registrationNumber = vehicle.RegistrationNumber,
                    vin = vehicle.VIN
                };
            }

            serviceRecords = await _context.ServiceRecords
                .Include(s => s.Organization)
                .Where(s => s.VehicleId == vId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new {
                    Title = s.Title,
                    Description = s.Description,
                    OdometerReading = s.OdometerReading,
                    CreatedAt = s.CreatedAt,
                    GarageName = s.Organization != null ? s.Organization.Name : "Independent",
                    GarageVerified = s.Organization != null && s.Organization.IsVerified == true
                })
                .ToListAsync();

            policeRecords = await _context.VehiclePoliceRecords
                .Where(p => p.VehicleId == vId)
                .OrderByDescending(p => p.IncidentDate)
                .Select(p => new {
                    p.IncidentDate,
                    p.IncidentType,
                    p.Description,
                    p.Severity,
                    p.PoliceStation
                })
                .ToListAsync();
        }

        return Ok(new {
            valid = true,
            workflowId = workflow.Id,
            generatedAt = workflow.CreatedAt,
            verifiedAt = DateTime.UtcNow,
            message = "This is a V-Sense verified vehicle history certificate.",
            aiInsight = workflow.AiInsight,
            vehicle = vehicleData,
            records = serviceRecords ?? new List<object>(),
            policeRecords = policeRecords ?? new List<object>()
        });
    }
}