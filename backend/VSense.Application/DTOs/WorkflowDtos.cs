using System;

namespace VSense.Application.DTOs;

public class ReportRequestDto
{
    public string vehicle_id { get; set; } = string.Empty;
    public string requested_by { get; set; } = string.Empty;
}

public class ApproveWorkflowDto
{
    public string? Comment { get; set; }
}