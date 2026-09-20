using Microsoft.EntityFrameworkCore;
using VSense.Domain.Entities;

namespace VSense.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<ServiceRecord> ServiceRecords => Set<ServiceRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Ensure Email is unique
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Vehicle mapping to existing "Vehicles" table
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("Vehicles");
            entity.Property(v => v.Id).HasColumnName("id");
            entity.Property(v => v.RegistrationNumber).HasColumnName("RegistrationNumber");
            entity.Property(v => v.ChassisNumber).HasColumnName("ChassisNumber");
            entity.Property(v => v.VIN).HasColumnName("VIN");
            entity.Property(v => v.Make).HasColumnName("Make");
            entity.Property(v => v.Model).HasColumnName("Model");
            entity.Property(v => v.ManufacturingYear).HasColumnName("ManufacturingYear");
            entity.Property(v => v.FuelType).HasColumnName("FuelType");
            entity.Property(v => v.Type).HasColumnName("Type");
            entity.Property(v => v.LicenseNumber).HasColumnName("LicenseNumber");

            entity.Ignore(v => v.VehicleNumber);
            entity.Ignore(v => v.Year);
        });

        // ServiceRecord -> Vehicle (VehicleId -> Vehicles.id)
        modelBuilder.Entity<ServiceRecord>()
            .HasOne(s => s.Vehicle)
            .WithMany(v => v.ServiceRecords)
            .HasForeignKey(s => s.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        // ServiceRecord -> User/Garage (GarageId -> Users.Id)
        modelBuilder.Entity<ServiceRecord>()
            .HasOne(s => s.Garage)
            .WithMany()
            .HasForeignKey(s => s.GarageId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}