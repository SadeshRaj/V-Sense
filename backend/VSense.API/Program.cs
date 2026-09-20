using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VSense.Domain.Entities;
using VSense.Infrastructure.Persistence;
using VSense.Infrastructure.Services;

Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// 1. Add DbContext with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Register Infrastructure Services
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!))
        };
    });

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 4. Dynamic CORS
var allowedOriginsSetting = builder.Configuration["AllowedOrigins"];
var allowedOrigins = string.IsNullOrWhiteSpace(allowedOriginsSetting)
    ? Array.Empty<string>()
    : allowedOriginsSetting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("DynamicCorsPolicy", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("DynamicCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 5. Apply pending EF Core migrations and seed data on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    // Apply any pending migrations automatically
    dbContext.Database.Migrate();

    // Seed default Admin if Users table is empty
    if (!dbContext.Users.Any())
    {
        dbContext.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            FullName = "System Administrator",
            Email = "admin@v-sense.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = "Administrator",
            IsActive = true,
            ApprovalStatus = "Active",
            CreatedAt = DateTime.UtcNow
        });
        dbContext.SaveChanges();
        Console.WriteLine("[INFO] Seeded default admin user: admin@v-sense.com");
    }
}

app.Run();