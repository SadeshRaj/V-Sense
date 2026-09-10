using CloudinaryDotNet.Actions;

namespace VSense.Application.Interfaces;

public interface IPhotoService
{
    Task<ImageUploadResult> AddPhotoAsync(Stream fileStream, string fileName);
    Task<DeletionResult> DeletePhotoAsync(string publicId);
}