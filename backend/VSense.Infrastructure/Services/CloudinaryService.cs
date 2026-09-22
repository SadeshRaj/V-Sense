using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;

namespace VSense.Infrastructure.Services;

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary? _cloudinary;
    private readonly bool _isConfigured;

    public CloudinaryService(IConfiguration config)
    {
        // FIX: Match the exact section name defined in your appsettings.json / Program.cs
        var cloudName = config["CloudinarySettings:CloudName"];
        var apiKey = config["CloudinarySettings:ApiKey"];
        var apiSecret = config["CloudinarySettings:ApiSecret"];

        _isConfigured = !string.IsNullOrWhiteSpace(cloudName)
            && cloudName != "YOUR_CLOUD_NAME"
            && !string.IsNullOrWhiteSpace(apiKey)
            && apiKey != "YOUR_API_KEY"
            && !string.IsNullOrWhiteSpace(apiSecret)
            && apiSecret != "YOUR_API_SECRET";

        if (_isConfigured)
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }
    }

    public async Task<string> UploadAsync(Stream fileStream, string fileName, string folder)
    {
        if (!_isConfigured || _cloudinary == null)
        {
            // Simulation mode fallback
            var safeFileName = Uri.EscapeDataString(Path.GetFileNameWithoutExtension(fileName));
            return $"https://res.cloudinary.com/vsense-demo/{folder}/{safeFileName}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        }

        // Real upload to your Cloudinary account
        var uploadParams = new RawUploadParams
        {
            File = new FileDescription(fileName, fileStream),
            Folder = folder,
            UseFilename = true,
            UniqueFilename = true,
            Overwrite = false
        };

        var result = await _cloudinary.UploadAsync(uploadParams);

        if (result.Error != null)
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");

        return result.SecureUrl.ToString();
    }
}