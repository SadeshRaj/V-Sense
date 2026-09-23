using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VSense.Domain.Entities;

[Table("AIWorkflows")]
public class AIWorkflow
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("Status")]
    public string Status { get; set; } = string.Empty;

    [Column("ai_insight")]
    public string? AiInsight { get; set; }

    [Column("fraud_flags")]
    public string? FraudFlags { get; set; }

    [Column("history_summary")]
    public string? HistorySummary { get; set; }

    // NEW HISTORY TRACKING FIELDS
    [Column("vehicle_id")]
    public string? VehicleId { get; set; }

    [Column("requested_by")]
    public string? RequestedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}