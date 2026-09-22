//using Microsoft.AspNetCore.Mvc;
//using System.Net.Http;
//using System.Threading.Tasks;
//
//[ApiController]
//[Route("api/workflows")]
//public class WorkflowsController : ControllerBase
//{
//    private readonly HttpClient _httpClient;
//
//    public WorkflowsController(IHttpClientFactory httpClientFactory)
//    {
//        // This HTTP client talks to your Python FastAPI server
//        _httpClient = httpClientFactory.CreateClient();
//        _httpClient.BaseAddress = new Uri("http://localhost:8000/");
//    }
//
//    [HttpPost("vehicle-report")]
//    public async Task<IActionResult> StartVehicleReport([FromBody] ReportRequestDto request)
//    {
//        // 1. Validate the user/token here (C# handles security)
//
//        // 2. Forward the request to the Python AI service
//        var aiResponse = await _httpClient.PostAsJsonAsync("api/workflows/start", request);
//
//        if (aiResponse.IsSuccessStatusCode)
//        {
//            var result = await aiResponse.Content.ReadFromJsonAsync<object>();
//            return Ok(result); // Return the workflow_id to Flutter
//        }
//
//        return StatusCode(500, "Failed to start AI workflow.");
//    }
//}