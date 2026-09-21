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
    public DbSet<ServiceRecord> ServiceRecords => Set<ServiceRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── 1. Organization Configurations ──────────────────────────────────
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.Property(o => o.Id).HasColumnName("id");
            entity.HasIndex(o => o.Email).IsUnique();
        });

        // ─── 2. User Configurations ──────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email)
                .IsUnique();
        });

        // ─── 3. Vehicle Configurations ───────────────────────────────────────
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasIndex(v => v.RegistrationNumber)
                .IsUnique();

            entity.HasIndex(v => v.VIN)
                .IsUnique();

            entity.HasIndex(v => v.LicenseNumber)
                .IsUnique();
        });

        // ─── 4. Payment Configurations ───────────────────────────────────────
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Id).HasColumnName("id");

            entity.HasIndex(p => p.TrasactionId)
                .IsUnique();
        });

        // ─── 5. VehicleOwnership Configurations ─────────────────────────────
        modelBuilder.Entity<VehicleOwnership>(entity =>
        {
            entity.Property(v => v.Id).HasColumnName("id");
        });

        // ─── 6. ServiceRecord Configurations ─────────────────────────────────
        modelBuilder.Entity<ServiceRecord>(entity =>
        {
            entity.Property(s => s.Id).HasColumnName("id");

            entity.HasOne(s => s.Vehicle)
                .WithMany()
                .HasForeignKey(s => s.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(s => s.Organization)
                .WithMany()
                .HasForeignKey(s => s.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(s => s.PerformedBy)
                .WithMany()
                .HasForeignKey(s => s.PerformedById)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}