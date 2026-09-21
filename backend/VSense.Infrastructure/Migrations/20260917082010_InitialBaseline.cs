using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // -----------------------------------------------------------------
            // 1. Users table already exists — add new columns only (idempotent)
            // -----------------------------------------------------------------
            migrationBuilder.Sql(@"
                ALTER TABLE ""Users""
                    ADD COLUMN IF NOT EXISTS ""BusinessName"" text,
                    ADD COLUMN IF NOT EXISTS ""RegistrationNumber"" text,
                    ADD COLUMN IF NOT EXISTS ""Phone"" text,
                    ADD COLUMN IF NOT EXISTS ""Address"" text,
                    ADD COLUMN IF NOT EXISTS ""BrDocumentUrl"" text,
                    ADD COLUMN IF NOT EXISTS ""ApprovalStatus"" text NOT NULL DEFAULT 'Active';
            ");

            // Email unique index on Users (if not exists)
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE tablename = 'Users' AND indexname = 'IX_Users_Email'
                    ) THEN
                        CREATE UNIQUE INDEX ""IX_Users_Email"" ON ""Users"" (""Email"");
                    END IF;
                END $$;
            ");

            // -----------------------------------------------------------------
            // 2. ChassisNumber index on Vehicles table (if not exists)
            // -----------------------------------------------------------------
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE tablename = 'Vehicles' AND indexname = 'IX_Vehicles_ChassisNumber'
                    ) THEN
                        CREATE INDEX ""IX_Vehicles_ChassisNumber"" ON ""Vehicles"" (""ChassisNumber"");
                    END IF;
                END $$;
            ");

            // -----------------------------------------------------------------
            // 3. ServiceRecords table
            // -----------------------------------------------------------------
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ServiceRecords"" (
                    ""Id"" uuid NOT NULL,
                    ""VehicleId"" uuid NOT NULL,
                    ""GarageId"" uuid NOT NULL,
                    ""Title"" text NOT NULL,
                    ""Description"" text NOT NULL,
                    ""PaymentMethod"" text NOT NULL,
                    ""PhotoUrls"" text NOT NULL DEFAULT '',
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_ServiceRecords"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_ServiceRecords_Vehicles_VehicleId""
                        FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles"" (id) ON DELETE RESTRICT,
                    CONSTRAINT ""FK_ServiceRecords_Users_GarageId""
                        FOREIGN KEY (""GarageId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
                );
            ");

            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE tablename = 'ServiceRecords' AND indexname = 'IX_ServiceRecords_VehicleId'
                    ) THEN
                        CREATE INDEX ""IX_ServiceRecords_VehicleId"" ON ""ServiceRecords"" (""VehicleId"");
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE tablename = 'ServiceRecords' AND indexname = 'IX_ServiceRecords_GarageId'
                    ) THEN
                        CREATE INDEX ""IX_ServiceRecords_GarageId"" ON ""ServiceRecords"" (""GarageId"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""ServiceRecords"";");
            migrationBuilder.Sql(@"
                ALTER TABLE ""Users""
                    DROP COLUMN IF EXISTS ""BusinessName"",
                    DROP COLUMN IF EXISTS ""RegistrationNumber"",
                    DROP COLUMN IF EXISTS ""Phone"",
                    DROP COLUMN IF EXISTS ""Address"",
                    DROP COLUMN IF EXISTS ""BrDocumentUrl"",
                    DROP COLUMN IF EXISTS ""ApprovalStatus"";
            ");
        }
    }
}
