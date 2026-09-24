using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "AIWorkflows",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "requested_by",
                table: "AIWorkflows",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vehicle_id",
                table: "AIWorkflows",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "created_at",
                table: "AIWorkflows");

            migrationBuilder.DropColumn(
                name: "requested_by",
                table: "AIWorkflows");

            migrationBuilder.DropColumn(
                name: "vehicle_id",
                table: "AIWorkflows");
        }
    }
}
