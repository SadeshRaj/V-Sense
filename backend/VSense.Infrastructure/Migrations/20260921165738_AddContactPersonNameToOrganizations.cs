using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContactPersonNameToOrganizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Alter Users column
            migrationBuilder.AlterColumn<string>(
                name: "NIC",
                table: "Users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            // 2. Add ContactPersonName to existing Organizations table
            migrationBuilder.AddColumn<string>(
                name: "ContactPersonName",
                table: "Organizations",
                type: "text",
                nullable: true);

            // 3. Add Unique Index on Email if it doesn't already exist
            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Email",
                table: "Organizations",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Organizations_Email",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "ContactPersonName",
                table: "Organizations");

            migrationBuilder.AlterColumn<string>(
                name: "NIC",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}