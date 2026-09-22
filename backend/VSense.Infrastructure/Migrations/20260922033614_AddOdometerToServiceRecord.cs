using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VSense.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOdometerToServiceRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OdometerReading",
                table: "ServiceRecords",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OdometerReading",
                table: "ServiceRecords");
        }
    }
}
