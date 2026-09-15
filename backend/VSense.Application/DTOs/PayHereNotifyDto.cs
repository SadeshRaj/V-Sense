// VSense.Application/DTOs/PayHereNotifyDto.cs
public class PayHereNotifyDto
{
    public string MerchantId { get; set; } = null!;
    public string OrderId { get; set; } = null!;
    public string PaymentId { get; set; } = null!;
    public string PayhereAmount { get; set; } = null!;
    public string PayhereCurrency { get; set; } = null!;
    public string StatusCode { get; set; } = null!;
    public string Md5sig { get; set; } = null!;
    public string? Custom1 { get; set; } // vehicleId
    public string? Custom2 { get; set; } // userId
}