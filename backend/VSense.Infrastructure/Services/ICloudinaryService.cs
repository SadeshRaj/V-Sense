namespace VSense.Infrastructure.Services;

public interface ICloudinaryService
{
    /// <summary>
    /// Uploads a file stream to Cloudinary and returns the secure URL.
    /// </summary>
    Task<string> UploadAsync(Stream fileStream, string fileName, string folder);
}
