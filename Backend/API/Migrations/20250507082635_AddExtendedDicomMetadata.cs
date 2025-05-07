using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedDicomMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnnotationData",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnnotationLabel",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnnotationType",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BodyPart",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Columns",
                table: "Images",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasAnnotations",
                table: "Images",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ImageType",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstanceNumber",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAccessed",
                table: "Images",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientBirthDate",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PatientSex",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Rows",
                table: "Images",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeriesDescription",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeriesNumber",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudyDate",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudyId",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudyTime",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UploadDate",
                table: "Images",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "WindowCenter",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WindowWidth",
                table: "Images",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnnotationData",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "AnnotationLabel",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "AnnotationType",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "BodyPart",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "Columns",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "HasAnnotations",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "ImageType",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "InstanceNumber",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "LastAccessed",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "PatientBirthDate",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "PatientSex",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "Rows",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "SeriesDescription",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "SeriesNumber",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "StudyDate",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "StudyId",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "StudyTime",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "UploadDate",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "WindowCenter",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "WindowWidth",
                table: "Images");
        }
    }
}
