using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using VSense.API.Controllers;
using VSense.Application.DTOs;
using VSense.Domain.Entities;
using Xunit;

namespace VSense.Tests.Controllers;

public class UsersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string BaseUrl = "/api/Users";
    private readonly CustomWebApplicationFactory _factory;

    public UsersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ───────────────────────── Helpers ─────────────────────────

    private async Task<User> SeedUserAsync(
        Guid? id = null,
        string fullName = "John Doe",
        string email = "john@example.com",
        string phone = "0771234567")
    {
        var userId = id ?? Guid.NewGuid();

        var user = new User
        {
            Id = userId,
            FullName = fullName,
            Email = email,
            PhoneNumber = phone,
            NIC = "199012345678",
            Role = "User",
            ProfilePictureUrl = "https://example.com/avatar.jpg",
            CreatedAt = DateTime.UtcNow
        };

        await _factory.ExecuteDbAsync(async db =>
        {
            db.Users.Add(user);
            await db.SaveChangesAsync();
        });

        return user;
    }

    private void SeedPhoneOtpCache(Guid userId, string otp, string phone)
    {
        var cache = _factory.Services.GetRequiredService<IMemoryCache>();
        var entryType = typeof(UsersController).GetNestedType("PhoneOtpEntry", BindingFlags.NonPublic)!;
        var entryInstance = Activator.CreateInstance(entryType, otp, phone)!;
        cache.Set($"PHONE_CHANGE_OTP_{userId}", entryInstance, TimeSpan.FromMinutes(5));
    }

    private void SeedPhoneVerifiedCache(Guid userId, string phone)
    {
        var cache = _factory.Services.GetRequiredService<IMemoryCache>();
        cache.Set($"PHONE_CHANGE_VERIFIED_{userId}", phone, TimeSpan.FromMinutes(15));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/Users/me
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetMe_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"{BaseUrl}/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_WhenUserDoesNotExist_Returns404NotFound()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());

        var response = await client.GetAsync($"{BaseUrl}/me");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetMe_WhenAuthenticated_Returns200OKWithUserProfile()
    {
        var userId = Guid.NewGuid();
        var user = await SeedUserAsync(userId, "Jane Doe", "jane@example.com", "0779876543");
        var client = _factory.CreateAuthenticatedClient(userId);

        var response = await client.GetAsync($"{BaseUrl}/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;

        root.GetProperty("id").GetGuid().Should().Be(user.Id);
        root.GetProperty("fullName").GetString().Should().Be("Jane Doe");
        root.GetProperty("email").GetString().Should().Be("jane@example.com");
        root.GetProperty("phoneNumber").GetString().Should().Be("0779876543");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PUT /api/Users/me
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task UpdateMe_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();
        var payload = new UpdateUserProfileRequestDto("New Name", "new@example.com", "0771234567", null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("", "valid@example.com", "0771234567")]
    [InlineData("Valid Name", "", "0771234567")]
    [InlineData("Valid Name", "valid@example.com", "")]
    [InlineData("   ", "valid@example.com", "0771234567")]
    public async Task UpdateMe_WhenMissingRequiredFields_Returns400BadRequest(
        string fullName, string email, string phone)
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new UpdateUserProfileRequestDto(fullName, email, phone, null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMe_WhenEmailInUseByAnotherUser_Returns409Conflict()
    {
        var userA = await SeedUserAsync(Guid.NewGuid(), email: "usera@example.com", phone: "0771111111");
        var userB = await SeedUserAsync(Guid.NewGuid(), email: "userb@example.com", phone: "0772222222");

        var client = _factory.CreateAuthenticatedClient(userA.Id);

        var payload = new UpdateUserProfileRequestDto("User A Updated", "USERB@EXAMPLE.COM", userA.PhoneNumber, null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateMe_WhenPhoneChangedWithoutOTPVerification_Returns400BadRequest()
    {
        var userId = Guid.NewGuid();
        var user = await SeedUserAsync(userId, phone: "0771111111");

        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new UpdateUserProfileRequestDto(user.FullName, user.Email, "0779999999", null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMe_WhenPhoneUnchanged_UpdatesProfileAndReturns200OK()
    {
        var userId = Guid.NewGuid();
        var user = await SeedUserAsync(userId, "Old Name", "old@example.com", "0771111111");

        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new UpdateUserProfileRequestDto("New Name", "new@example.com", "0771111111", null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var dbUser = await _factory.QueryDbAsync(db => db.Users.FirstOrDefaultAsync(u => u.Id == userId));
        dbUser.Should().NotBeNull();
        dbUser!.FullName.Should().Be("New Name");
        dbUser.Email.Should().Be("new@example.com");
    }

    [Fact]
    public async Task UpdateMe_WhenPhoneChangedAndVerified_UpdatesProfileConsumesCacheAndReturns200OK()
    {
        var userId = Guid.NewGuid();
        var newPhone = "0778888888";
        await SeedUserAsync(userId, phone: "0771111111");
        SeedPhoneVerifiedCache(userId, newPhone);

        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new UpdateUserProfileRequestDto("Updated User", "updated@example.com", newPhone, null);

        var response = await client.PutAsJsonAsync($"{BaseUrl}/me", payload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var dbUser = await _factory.QueryDbAsync(db => db.Users.FirstOrDefaultAsync(u => u.Id == userId));
        dbUser!.PhoneNumber.Should().Be(newPhone);

        var cache = _factory.Services.GetRequiredService<IMemoryCache>();
        var hasVerificationKey = cache.TryGetValue($"PHONE_CHANGE_VERIFIED_{userId}", out _);
        hasVerificationKey.Should().BeFalse("verification cache key should be consumed on successful update");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POST /api/Users/me/phone/send-otp
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task SendPhoneChangeOtp_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();
        var payload = new SendPhoneChangeOtpRequestDto("0771234567");

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("0812345678")]
    [InlineData("07712345678")]
    [InlineData("077ABCDEF1")]
    public async Task SendPhoneChangeOtp_WhenPhoneFormatInvalid_Returns400BadRequest(string invalidPhone)
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new SendPhoneChangeOtpRequestDto(invalidPhone);

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendPhoneChangeOtp_WhenPhoneIsSameAsCurrent_Returns400BadRequest()
    {
        var userId = Guid.NewGuid();
        var user = await SeedUserAsync(userId, phone: "0771234567");
        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new SendPhoneChangeOtpRequestDto(user.PhoneNumber);

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendPhoneChangeOtp_WhenPhoneInUseByAnotherUser_Returns409Conflict()
    {
        var userA = await SeedUserAsync(Guid.NewGuid(), phone: "0771111111");
        var userB = await SeedUserAsync(Guid.NewGuid(), phone: "0772222222");

        var client = _factory.CreateAuthenticatedClient(userA.Id);

        var payload = new SendPhoneChangeOtpRequestDto(userB.PhoneNumber);

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POST /api/Users/me/phone/verify-otp
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task VerifyPhoneChangeOtp_WithoutToken_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();
        var payload = new VerifyPhoneChangeOtpRequestDto("0771234567", "1234");

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/verify-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task VerifyPhoneChangeOtp_WhenOtpOrPhoneMismatch_Returns400BadRequest()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(userId);
        SeedPhoneOtpCache(userId, "1234", "0779999999");

        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new VerifyPhoneChangeOtpRequestDto("0779999999", "9999");

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/verify-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task VerifyPhoneChangeOtp_WhenOtpValid_ClearsOtpSetsVerifiedCacheAndReturns200OK()
    {
        var userId = Guid.NewGuid();
        var newPhone = "0779999999";
        await SeedUserAsync(userId);
        SeedPhoneOtpCache(userId, "5555", newPhone);

        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new VerifyPhoneChangeOtpRequestDto(newPhone, "5555");

        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/verify-otp", payload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var cache = _factory.Services.GetRequiredService<IMemoryCache>();
        var hasVerifiedToken = cache.TryGetValue($"PHONE_CHANGE_VERIFIED_{userId}", out string? verifiedPhone);

        hasVerifiedToken.Should().BeTrue();
        verifiedPhone.Should().Be(newPhone);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // AUDIT & VULNERABILITY FINDING TESTS (EXPECTED TO FAIL)
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task VULN_001_VerifyPhoneChangeOtp_EnforcesMaxFailedAttempts_ToPreventBruteForcing()
    {
        var userId = Guid.NewGuid();
        var newPhone = "0771234567";
        await SeedUserAsync(userId);
        SeedPhoneOtpCache(userId, "1234", newPhone);

        var client = _factory.CreateAuthenticatedClient(userId);

        // Attempt 5 incorrect OTP verifications
        for (int i = 0; i < 5; i++)
        {
            var wrongPayload = new VerifyPhoneChangeOtpRequestDto(newPhone, "9999");
            await client.PostAsJsonAsync($"{BaseUrl}/me/phone/verify-otp", wrongPayload);
        }

        // Attempt verification with the correct OTP after multiple failures
        var correctPayload = new VerifyPhoneChangeOtpRequestDto(newPhone, "1234");
        var response = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/verify-otp", correctPayload);

        // ❌ FAILS: The endpoint currently allows unlimited failed attempts and accepts "1234" (returns 200 OK)
        // instead of invalidating the OTP or returning 400/429 after maximum allowed retries.
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest,
            "OTP should be invalidated after maximum failed attempts to prevent 4-digit brute-forcing attacks");
    }

    [Fact]
    public async Task VULN_002_SendPhoneChangeOtp_EnforcesCooldownPeriod_ToPreventSMSFlooding()
    {
        Environment.SetEnvironmentVariable("TEXTLK_API_TOKEN", "test-token");
        Environment.SetEnvironmentVariable("TEXTLK_SENDER_ID", "test-sender");

        var userId = Guid.NewGuid();
        await SeedUserAsync(userId, phone: "0771111111");
        var client = _factory.CreateAuthenticatedClient(userId);

        var payload = new SendPhoneChangeOtpRequestDto("0779998888");

        // Initial OTP request
        await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        // Immediate second OTP request within seconds
        var secondResponse = await client.PostAsJsonAsync($"{BaseUrl}/me/phone/send-otp", payload);

        // ❌ FAILS: Controller currently processes every request without throttling (returns 200 OK instead of 429 TooManyRequests)
        secondResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests,
            "rapid consecutive OTP requests should trigger a cooldown mechanism to prevent SMS financial flooding");
    }
}