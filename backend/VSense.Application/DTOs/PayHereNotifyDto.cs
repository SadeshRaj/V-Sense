namespace VSense.Application.DTOs;

public class PayHereNotifyDto
{
    public string merchant_id { get; set; } = null!;
    public string order_id { get; set; } = null!;
    public string payment_id { get; set; } = null!;
    public string payhere_amount { get; set; } = null!;
    public string payhere_currency { get; set; } = null!;
    public string status_code { get; set; } = null!;
    public string md5sig { get; set; } = null!;
    public string? custom_1 { get; set; }
    public string? custom_2 { get; set; }
}