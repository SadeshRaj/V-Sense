using System;
using System.Collections.Generic;

namespace VSense.Application.DTOs;

public class CreateServiceRecordRequestDto
{
    public Guid VehicleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public int OdometerReading { get; set; }
}

public class ServiceRecordResponseDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public Guid GarageId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public int OdometerReading { get; set; }
    public List<string> PhotoUrls { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}