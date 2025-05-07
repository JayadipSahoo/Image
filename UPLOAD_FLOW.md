# DICOM Upload Flow Documentation

## Overview

This document explains the complete process of uploading DICOM files in our application, focusing on the client-side metadata extraction approach. It covers the frontend user interface through the backend processing, filesystem storage, and metadata extraction process.

## Visual Flow Diagram

```
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────┐
│  User      │     │   Frontend     │     │    Backend       │     │   Database     │     │  File       │
│  Browser   │────>│   Angular      │────>│    .NET Core     │────>│   SQL Server   │     │  System     │
└─────────────┘     └────────────────┘     └──────────────────┘     └────────────────┘     └─────────────┘
      │                     │                      │                        │                     │
      │  Select File        │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │                     │  Read File as        │                        │                     │
      │                     │  ArrayBuffer         │                        │                     │
      │                     │                      │                        │                     │
      │                     │  Extract DICOM       │                        │                     │
      │                     │  Metadata            │                        │                     │
      │                     │                      │                        │                     │
      │                     │  Create FormData     │                        │                     │
      │                     │  with File & Metadata│                        │                     │
      │                     │                      │                        │                     │
      │                     │  Send File +         │                        │                     │
      │                     │  Extracted Metadata  │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Server-side           │                     │
      │                     │                      │  File Validation       │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Generate Unique       │                     │
      │                     │                      │  Filename              │                     │
      │                     │                      │                        │                     │
      │                     │                      │  Save DICOM File       │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  Save Complete         │                     │
      │                     │                      │  DicomData Record      │                     │
      │                     │                      │  with Extracted        │                     │
      │                     │                      │  Metadata              │                     │
      │                     │                      │─────────────────────>  │                     │
      │                     │                      │                        │                     │
      │                     │  Return Success +    │                        │                     │
      │                     │  Image ID            │                        │                     │
      │  Show Success &     │<─────────────────────                         │                     │
      │  Redirect to Viewer │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
      │                     │                      │                        │                     │
      │  View Image         │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │  Load Image with     │                        │                     │
      │                     │  Cornerstone.js      │                        │                     │
      │                     │──────────────────────>                        │                     │
      │                     │                      │                        │                     │
      │  Display Image      │                      │                        │                     │
      │  with Metadata      │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
```

## Step-by-Step Process

### 1. Frontend: User Interface (UploadComponent)

**File Selection:**
- User navigates to the upload page
- User selects a DICOM (.dcm) file using the file input control
- Component stores the selected file in memory

**File Validation:**
```typescript
private validateFile(file: File): boolean {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.dcm')) {
    this.errorMessage = 'Please select a valid DICOM (.dcm) file';
    return false;
  }
  
  // Check file size
  if (file.size > this.maxFileSize) {
    this.errorMessage = `File is too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`;
    return false;
  }
  
  return true;
}
```

**Upload Triggering:**
- When user clicks the upload button, `uploadFile()` method is called
- Upload progress indicator is displayed
- The file is passed to the DICOM service

### 2. Frontend: Client-Side Metadata Extraction (ImageService)

**Metadata Extraction Process:**
```typescript
private extractMetadataFromFile(file: File): Observable<DicomMetadata | null> {
  return new Observable<DicomMetadata | null>(observer => {
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        console.error('Error: FileReader did not return array buffer');
        observer.next(null);
        observer.complete();
        return;
      }
      
      try {
        // Always use direct dicomParser approach for more reliable metadata extraction
        console.log(`Parsing DICOM file: ${file.name}, size: ${arrayBuffer.byteLength} bytes`);
        const byteArray = new Uint8Array(arrayBuffer);
        
        // Check for DICOM magic header (DICM) at offset 128
        const hasDicomHeader = byteArray.length > 132 && 
                            byteArray[128] === 68 && // 'D'
                            byteArray[129] === 73 && // 'I'
                            byteArray[130] === 67 && // 'C'
                            byteArray[131] === 77;   // 'M'
        
        console.log(`File has DICOM header: ${hasDicomHeader}`);
        
        if (hasDicomHeader) {
          try {
            // Parse the DICOM file
            const dataSet = dicomParser.parseDicom(byteArray);
            console.log('DICOM dataset parsed successfully');
            
            if (dataSet && dataSet.elements) {
              const metadata = this.extractMetadataFromDataset(dataSet);
              
              // Only proceed with valid metadata
              if (metadata && Object.values(metadata).some(val => val !== null && val !== undefined)) {
                observer.next(metadata);
                observer.complete();
                return;
              }
            }
          } catch (parseError) {
            console.error('Error parsing DICOM file:', parseError);
          }
        }
        
        console.warn('Could not extract valid metadata from DICOM dataset');
        observer.next(null);
        observer.complete();
      } catch (error) {
        console.error('Error processing DICOM file:', error);
        observer.next(null);
        observer.complete();
      }
    };
    
    fileReader.onerror = () => {
      console.error('Error reading file');
      observer.next(null);
      observer.complete();
    };
    
    // Read the file as ArrayBuffer
    fileReader.readAsArrayBuffer(file);
  });
}
```

**DICOM Tag Extraction:**
```typescript
private extractMetadataFromDataset(dataset: any): DicomMetadata {
  try {
    const metadata: DicomMetadata = {};
    
    // Helper function to get string from dataset with more debugging
    const getString = (tag: string, description: string): string | null => {
      try {
        if (dataset.elements[tag]) {
          const value = dataset.string(tag);
          console.log(`${description} (${tag}): ${value}`);
          return value || null;
        } else {
          console.log(`${description} (${tag}): <tag not found>`);
        }
      } catch (error) {
        console.warn(`Error extracting ${description} (${tag}):`, error);
      }
      return null;
    };
    
    // Patient information
    metadata.patientName = getString(DicomTags.PatientName, 'Patient Name');
    metadata.patientId = getString(DicomTags.PatientID, 'Patient ID');
    metadata.patientBirthDate = getString(DicomTags.PatientBirthDate, 'Birth Date');
    metadata.patientSex = getString(DicomTags.PatientSex, 'Sex');
    
    // Study information
    metadata.studyInstanceUid = getString(DicomTags.StudyInstanceUID, 'Study UID');
    metadata.studyDate = getString(DicomTags.StudyDate, 'Study Date');
    metadata.studyTime = getString(DicomTags.StudyTime, 'Study Time');
    metadata.studyId = getString(DicomTags.StudyID, 'Study ID');
    
    // Series information
    metadata.modality = getString(DicomTags.Modality, 'Modality');
    metadata.seriesInstanceUid = getString(DicomTags.SeriesInstanceUID, 'Series UID');
    metadata.seriesNumber = getString(DicomTags.SeriesNumber, 'Series Number');
    metadata.seriesDescription = getString(DicomTags.SeriesDescription, 'Series Description');
    metadata.bodyPart = getString(DicomTags.BodyPartExamined, 'Body Part');
    
    // Image information
    metadata.rows = parseInt(getString(DicomTags.Rows, 'Rows') || '0');
    metadata.columns = parseInt(getString(DicomTags.Columns, 'Columns') || '0');
    metadata.imageType = getString(DicomTags.ImageType, 'Image Type');
    metadata.instanceNumber = getString(DicomTags.InstanceNumber, 'Instance Number');
    metadata.sopInstanceUid = getString(DicomTags.SOPInstanceUID, 'SOP Instance UID');
    
    // Window settings
    metadata.windowCenter = getString(DicomTags.WindowCenter, 'Window Center');
    metadata.windowWidth = getString(DicomTags.WindowWidth, 'Window Width');

    // Count non-null values for debugging
    const nonNullCount = Object.values(metadata).filter(val => val !== null && val !== undefined).length;
    console.log(`Extracted ${nonNullCount} non-null metadata values`);
    
    return metadata;
  } catch (error) {
    console.error('Error extracting DICOM metadata from dataset:', error);
    return {};
  }
}
```

**Uploading File with Extracted Metadata:**
```typescript
private uploadSingleFile(file: File): Observable<DicomImage | null> {
  console.log('Preparing upload for DICOM file:', file.name);
  
  // Extract DICOM metadata before uploading
  return this.extractMetadataFromFile(file).pipe(
    switchMap(metadata => {
      console.log('Extracted metadata:', metadata);
      
      // Now create FormData with file and metadata
      const formData = new FormData();
      formData.append('file', file);
      
      // Add all metadata as separate form fields
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      return this.http.post<DicomImage>(`${this.apiUrl}/upload`, formData).pipe(
        tap(response => console.log(`Successfully uploaded ${file.name}:`, response)),
        catchError(error => {
          console.error(`Error uploading ${file.name}:`, error);
          return of(null);
        })
      );
    }),
    catchError(error => {
      console.error(`Error extracting metadata from ${file.name}:`, error);
      // Continue with upload without metadata rather than using dummy values
      const formData = new FormData();
      formData.append('file', file);
      return this.http.post<DicomImage>(`${this.apiUrl}/upload`, formData).pipe(
        tap(response => console.log(`Successfully uploaded ${file.name} without metadata:`, response)),
        catchError(error => {
          console.error(`Error uploading ${file.name}:`, error);
          return of(null);
        })
      );
    })
  );
}
```

**Key Features:**
1. Reads file as ArrayBuffer using FileReader
2. Checks for DICOM magic header ("DICM") at offset 128
3. Uses dicomParser library to parse the DICOM data
4. Extracts metadata for patient, study, series, and image fields
5. Creates FormData with both the file and extracted metadata
6. Fallback behavior: continues upload even if metadata extraction fails

### 3. Backend: API Controller (ImageController)

**File and Metadata Reception:**
```csharp
[HttpPost("upload")]
public async Task<IActionResult> Upload(IFormFile file, string metadata)
{
    if (file == null || file.Length == 0)
    {
        return BadRequest("No file uploaded");
    }
    
    try
    {
        _logger.LogInformation("Processing uploaded file: {FileName}, Size: {Size}", 
            file.FileName, file.Length);
        
        // Create directory if it doesn't exist
        var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "DICOM");
        if (!Directory.Exists(uploadDir))
        {
            Directory.CreateDirectory(uploadDir);
            _logger.LogInformation("Created directory: {Dir}", uploadDir);
        }
        
        // Generate unique filename to prevent overwriting
        var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
        var filePath = Path.Combine(uploadDir, uniqueFileName);
        
        _logger.LogInformation("Saving file to: {Path}", filePath);
        
        // Save the file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        
        // Parse the metadata JSON if provided
        DicomMetadataDto parsedMetadata = null;
        if (!string.IsNullOrEmpty(metadata))
        {
            try
            {
                parsedMetadata = JsonSerializer.Deserialize<DicomMetadataDto>(metadata);
                _logger.LogInformation("Successfully parsed metadata from client");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing metadata JSON");
            }
        }
        
        // Create record in database with provided metadata or defaults
        var dicomData = new DicomDataModel
        {
            FileName = file.FileName,
            FileSize = file.Length,
            StoragePath = filePath,
            UploadDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            
            // Set metadata from parsed client data or use defaults
            PatientName = parsedMetadata?.PatientName ?? "Anonymous",
            PatientId = parsedMetadata?.PatientId ?? "UNKNOWN",
            PatientSex = parsedMetadata?.PatientSex ?? "U",
            PatientBirthDate = ParseDateOrNull(parsedMetadata?.PatientBirthDate),
            
            Modality = parsedMetadata?.Modality ?? "OT",
            Rows = parsedMetadata?.Rows ?? 0,
            Columns = parsedMetadata?.Columns ?? 0,
            ImageType = parsedMetadata?.ImageType ?? "UNKNOWN",
            
            StudyId = parsedMetadata?.StudyId ?? "UNKNOWN",
            StudyInstanceUid = parsedMetadata?.StudyInstanceUid ?? Guid.NewGuid().ToString(),
            StudyDate = ParseDateOrNull(parsedMetadata?.StudyDate),
            StudyTime = parsedMetadata?.StudyTime ?? DateTime.Now.ToString("HHmmss"),
            
            SeriesInstanceUid = parsedMetadata?.SeriesInstanceUid ?? Guid.NewGuid().ToString(),
            SeriesNumber = parsedMetadata?.SeriesNumber ?? "1",
            SeriesDescription = parsedMetadata?.SeriesDescription ?? "Imported Series",
            
            BodyPart = parsedMetadata?.BodyPart ?? "UNKNOWN",
            
            InstanceNumber = parsedMetadata?.InstanceNumber ?? "1",
            WindowCenter = parsedMetadata?.WindowCenter != null ? Convert.ToDouble(parsedMetadata.WindowCenter) : 0,
            WindowWidth = parsedMetadata?.WindowWidth != null ? Convert.ToDouble(parsedMetadata.WindowWidth) : 0,
            
            HasAnnotations = false,
            AnnotationData = "{}",
            AnnotationLabel = "",
            AnnotationType = ""
        };
        
        _context.DicomData.Add(dicomData);
        await _context.SaveChangesAsync();
        
        // Return success response with basic information
        return Ok(new { 
            id = dicomData.Id,
            name = dicomData.FileName,
            patientName = dicomData.PatientName,
            patientId = dicomData.PatientId,
            modality = dicomData.Modality,
            studyInstanceUid = dicomData.StudyInstanceUid,
            message = "DICOM image uploaded successfully"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error uploading file: {FileName}", file?.FileName);
        return StatusCode(500, new { error = "Error uploading file", message = ex.Message });
    }
}
```

**Key Steps:**
1. Receive both the file and extracted metadata JSON
2. Validate the uploaded file
3. Create upload directory if needed
4. Generate a unique filename for the uploaded file
5. Save the file to the filesystem
6. Parse the provided metadata JSON
7. Create a new DicomDataModel record with:
   - Basic file information (name, size, path)
   - All metadata from client-extracted DICOM tags
   - Default values for any missing metadata fields
8. Save the record to the consolidated DicomData table
9. Return success response with the image ID and basic information

## Data Flow Summary

The improved upload and metadata process now follows these stages:

1. **Client-Side Preparation**:
   - File validation on frontend
   - File read as ArrayBuffer in browser
   - DICOM header validation in browser
   - Metadata extraction directly from DICOM file in browser
   - Creation of FormData with both file and extracted metadata

2. **Server Upload**:
   - File transferred via HTTP multipart/form-data
   - Metadata JSON transmitted alongside file
   - File storage on the server filesystem
   - Creation of DicomData record with extracted metadata
   - Return of image information to frontend

3. **Viewing Experience**:
   - Immediate access to complete metadata
   - No need for delayed metadata extraction
   - Better user experience with consistent data

## Advantages of the New Approach

### 1. Improved Client-Side Processing

The client-side metadata extraction offers several advantages:

- **Reduced Server Load**: Metadata extraction happens in the user's browser
- **Immediate Validation**: DICOM format validation before upload
- **Parallel Processing**: Multiple files can be processed simultaneously
- **Better UX**: Users see immediate feedback on file validity

### 2. Enhanced Metadata Quality

The direct use of dicomParser provides more reliable metadata:

- **More Complete Fields**: Extracts a wide range of DICOM tags
- **Better Validation**: Verifies DICOM header before extraction
- **Detailed Debugging**: Comprehensive logging for troubleshooting
- **Graceful Fallbacks**: Uploads continue even if extraction fails

### 3. Server-Side Integration

The backend now leverages client-extracted metadata:

- **Consolidated Storage**: All metadata saved directly to database
- **Reduced Processing**: No need for server-side DICOM parsing
- **Complete Records**: Database has full metadata from upload
- **Simplified API**: Endpoints focused on file storage and retrieval

## Future Enhancements

Potential improvements to the upload process include:

1. **Batch Processing UI**: Enhanced interface for selecting multiple files
2. **Progress Tracking**: Real-time progress for large files and batch uploads
3. **Pre-Upload Review**: Show extracted metadata before confirming upload
4. **Validation Rules**: Apply business rules to reject invalid DICOM files
5. **MIME Type Detection**: Improve file validation beyond extension checking 