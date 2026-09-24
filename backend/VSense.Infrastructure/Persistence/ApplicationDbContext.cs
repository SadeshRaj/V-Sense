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
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<VehicleOwnership> VehicleOwnerships => Set<VehicleOwnership>();
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();

    // Notifications DbSets
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<ServiceRecord> ServiceRecords => Set<ServiceRecord>();
    public DbSet<AIWorkflow> AIWorkflows { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.Property(o => o.Id).HasColumnName("id");
            entity.HasIndex(o => o.Email).IsUnique();
            // IsVerified is a computed property (derived from Status); exclude from DB mapping
            entity.Ignore(o => o.IsVerified);
            entity.Property(o => o.Status).HasMaxLength(20).HasDefaultValue("Pending");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.Property(v => v.Id).HasColumnName("id");
            entity.HasIndex(v => v.RegistrationNumber).IsUnique();
            entity.HasIndex(v => v.VIN).IsUnique();
            entity.HasIndex(v => v.LicenseNumber).IsUnique();
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Id).HasColumnName("id");
            entity.HasIndex(p => p.TrasactionId).IsUnique();
        });

        modelBuilder.Entity<VehicleOwnership>(entity =>
        {
            entity.Property(v => v.Id).HasColumnName("id");
        });

        modelBuilder.Entity<ServiceRecord>(entity =>
        {
            entity.HasOne(s => s.Vehicle)
                .WithMany()
                .HasForeignKey(s => s.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Correctly configured to Organization
            entity.HasOne(s => s.Organization)
                .WithMany()
                .HasForeignKey(s => s.GarageId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}