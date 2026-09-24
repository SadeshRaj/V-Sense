using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusToOrganization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceRecords_Users_PerformedById",
                table: "ServiceRecords");

            migrationBuilder.DropIndex(
                name: "IX_ServiceRecords_PerformedById",
                table: "ServiceRecords");

            migrationBuilder.DropColumn(
                name: "PerformedById",
                table: "ServiceRecords");

            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "Organizations");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "ServiceRecords",
                newName: "Id");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Organizations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Organizations");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ServiceRecords",
                newName: "id");

            migrationBuilder.AddColumn<Guid>(
                name: "PerformedById",
                table: "ServiceRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Organizations",
                type: "boolean",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRecords_PerformedById",
                table: "ServiceRecords",
                column: "PerformedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceRecords_Users_PerformedById",
                table: "ServiceRecords",
                column: "PerformedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
