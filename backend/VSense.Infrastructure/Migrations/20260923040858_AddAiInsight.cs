using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiInsight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Since the AIWorkflows table already exists in the database,
            // we skip CreateTable and just add the missing column.
            migrationBuilder.AddColumn<string>(
                name: "ai_insight",
                table: "AIWorkflows",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // If we rollback, we just drop the column, not the whole table.
            migrationBuilder.DropColumn(
                name: "ai_insight",
                table: "AIWorkflows");
        }
    }
}