using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VSense.Application.Interfaces;

namespace VSense.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UploadsController : ControllerBase
{
    private readonly IPhotoService _photoService;

    public UploadsController(IPhotoService photoService)
    {
        _photoService = photoService;
    }

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file was uploaded." });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { message = "Invalid file type. Only JPG, PNG, and WEBP are allowed." });

        using var stream = file.OpenReadStream();
        var result = await _photoService.AddPhotoAsync(stream, file.FileName);

        if (result.Error != null)
            return BadRequest(new { message = result.Error.Message });

        return Ok(new
        {
            publicId = result.PublicId,
            url = result.SecureUrl.AbsoluteUri
        });
    }

    [HttpDelete("image/{publicId}")]
    public async Task<IActionResult> DeleteImage(string publicId)
    {
        var result = await _photoService.DeletePhotoAsync(publicId);

        if (result.Result == "ok")
            return Ok(new { message = "Image deleted successfully." });

        return BadRequest(new { message = "Failed to delete image from Cloudinary." });
    }
}