using Microsoft.EntityFrameworkCore;
using VSense.Domain.Entities;

namespace VSense.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<VehicleOwnership> VehicleOwnerships => Set<VehicleOwnership>();
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();
    
    // Notifications DbSets
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configurations
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Vehicle Configurations
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasIndex(v => v.RegistrationNumber)
                .IsUnique();

            entity.HasIndex(v => v.VIN)
                .IsUnique();

            entity.HasIndex(v => v.LicenseNumber)
                .IsUnique();
        });

        // Payment Configurations
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Id).HasColumnName("id"); // Map lowercase primary key

            entity.HasIndex(p => p.TrasactionId)
                .IsUnique();
        });

        // VehicleOwnership Configurations
        modelBuilder.Entity<VehicleOwnership>(entity =>
        {
            entity.Property(v => v.Id).HasColumnName("id"); // Map lowercase primary key
        });
    }
}