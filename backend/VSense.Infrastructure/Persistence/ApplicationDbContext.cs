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
        // Prevents the same PayHere payment transaction
        // from being processed more than once.
        modelBuilder.Entity<Payment>()
            .HasIndex(p => p.TrasactionId)
            .IsUnique();
    }
}