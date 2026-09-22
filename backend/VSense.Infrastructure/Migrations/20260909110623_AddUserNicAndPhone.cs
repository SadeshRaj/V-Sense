using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserNicAndPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id"" uuid NOT NULL,
                    ""FullName"" text NOT NULL,
                    ""Email"" text NOT NULL,
                    ""PasswordHash"" text NOT NULL,
                    ""NIC"" text NOT NULL,
                    ""PhoneNumber"" text NOT NULL,
                    ""Role"" text NOT NULL,
                    ""IsActive"" boolean NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_Users"" PRIMARY KEY (""Id"")
                );

                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE tablename = 'Users' AND indexname = 'IX_Users_Email'
                    ) THEN
                        CREATE UNIQUE INDEX ""IX_Users_Email"" ON ""Users"" (""Email"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Users"";");
        }
    }
}