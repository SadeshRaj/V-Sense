using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFraudAndHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "fraud_flags",
                table: "AIWorkflows",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "history_summary",
                table: "AIWorkflows",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "fraud_flags",
                table: "AIWorkflows");

            migrationBuilder.DropColumn(
                name: "history_summary",
                table: "AIWorkflows");
        }
    }
}
