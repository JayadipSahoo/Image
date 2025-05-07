using System.ComponentModel.DataAnnotations;

namespace API.Models
{
    public class Image
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public required string Name { get; set; }
        
        // Instead of storing the binary data, we'll store the file path
        [Required]
        public required string FilePath { get; set; }
        
        [Required]
        public required string ContentType { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ModifiedAt { get; set; }

        // File information
        public long FileSize { get; set; }
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;
        public DateTime? LastAccessed { get; set; }

        // Flag to indicate if the image data is compressed
        public bool IsCompressed { get; set; } = false;

        // DICOM specific metadata
        public string? PatientId { get; set; }
        public string? PatientName { get; set; }
        public string? PatientBirthDate { get; set; }
        public string? PatientSex { get; set; }
        
        public string? Modality { get; set; }
        public int? Rows { get; set; }
        public int? Columns { get; set; }
        public string? ImageType { get; set; }
        
        public string? StudyId { get; set; }
        public string? StudyInstanceUid { get; set; }
        public string? StudyDate { get; set; }
        public string? StudyTime { get; set; }
        
        public string? SeriesInstanceUid { get; set; }
        public string? SeriesNumber { get; set; }
        public string? SeriesDescription { get; set; }
        public string? BodyPart { get; set; }
        
        public string? WindowCenter { get; set; }
        public string? WindowWidth { get; set; }
        public string? InstanceNumber { get; set; }
        public string? SopInstanceUid { get; set; }
        
        // Annotation related fields
        public bool HasAnnotations { get; set; } = false;
        public string? AnnotationType { get; set; }
        public string? AnnotationLabel { get; set; }
        public string? AnnotationData { get; set; }
    }
} 