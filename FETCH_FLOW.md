# DICOM Fetch and Viewing Flow Documentation

## Overview

This document explains the complete process of fetching and displaying DICOM files in our application, from the initial API request through rendering in the browser using Cornerstone.js, including the metadata handling process with the client-side extraction approach.

## Visual Flow Diagram

```
┌─────────────┐     ┌────────────────┐     ┌──────────────────┐     ┌────────────────┐     ┌─────────────┐
│  User      │     │   Frontend     │     │    Backend       │     │   Database     │     │  File       │
│  Browser   │────>│   Angular      │────>│    .NET Core     │────>│   SQL Server   │     │  System     │
└─────────────┘     └────────────────┘     └──────────────────┘     └────────────────┘     └─────────────┘
      │                     │                      │                        │                     │
      │  Request Image      │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │  API Request         │                        │                     │
      │                     │─────────────────────>│                        │                     │
      │                     │                      │  Query Database        │                     │
      │                     │                      │───────────────────────>│                     │
      │                     │                      │                        │                     │
      │                     │                      │  Return Metadata       │                     │
      │                     │                      │  & File Path           │                     │
      │                     │                      │<───────────────────────│                     │
      │                     │                      │                        │                     │
      │                     │                      │  Read DICOM File       │                     │
      │                     │                      │  from Disk             │                     │
      │                     │                      │────────────────────────────────────────────> │
      │                     │                      │                        │                     │
      │                     │                      │  Return File           │                     │
      │                     │                      │  Binary Data           │                     │
      │                     │                      │<─────────────────────────────────────────────│
      │                     │                      │                        │                     │
      │                     │  Send DICOM binary   │                        │                     │
      │                     │<─────────────────────│                        │                     │
      │                     │                      │                        │                     │
      │                     │  Parse DICOM with    │                        │                     │
      │                     │  Cornerstone         │                        │                     │
      │                     │                      │                        │                     │
      │  Display Image      │                      │                        │                     │
      │  with Metadata      │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
      │                     │                      │                        │                     │
      │  User Interacts     │                      │                        │                     │
      │  (Zoom, Pan, etc)   │                      │                        │                     │
      │─────────────────────>                      │                        │                     │
      │                     │                      │                        │                     │
      │  Cornerstone        │                      │                        │                     │
      │  Updates Display    │                      │                        │                     │
      │<─────────────────────                      │                        │                     │
```

## Step-by-Step Process

### 1. Frontend: User Interface Initialization (DicomViewerComponent)

**Component Setup:**
```typescript
export class DicomViewerComponent implements AfterViewInit, OnChanges {
  @Input() selectedImage: DicomImage | null = null;
  @ViewChild('dicomContainer') dicomContainer!: ElementRef;
  
  private element: HTMLElement | null = null;
  private viewport: cornerstone.Viewport | null = null;
  private cornerstoneInitialized = false;
  
  isLoading = false;
  isImageLoaded = false;
  loadError: string | null = null;
  
  constructor(private imageService: ImageService) {
    // Initialize cornerstone and its dependencies
    this.initCornerstoneWADOImageLoader();
  }
  // ...
}
```

- Component receives a selectedImage input from parent component
- A DOM element is referenced via ViewChild for Cornerstone to render into
- State variables track loading status and errors
- Initialization of Cornerstone libraries happens in constructor

**Cornerstone Library Initialization:**
```typescript
private initCornerstoneWADOImageLoader(): void {
  try {
    // Configure cornerstone
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    console.log('Cornerstone WADO Image Loader initialized');
  } catch (error) {
    console.error('Error initializing Cornerstone WADO Image Loader:', error);
    this.loadError = 'Failed to initialize DICOM viewer';
  }
}

private initCornerstoneElement(): void {
  if (!this.element) return;
  
  try {
    // Enable the cornerstone element
    cornerstone.enable(this.element);
    this.cornerstoneInitialized = true;
    console.log('Cornerstone enabled on element');
  } catch (error) {
    console.error('Error enabling Cornerstone on element:', error);
    this.loadError = 'Failed to initialize DICOM viewer';
  }
}
```

- Cornerstone.js and related libraries are configured
- WADO Image Loader is connected to Cornerstone core
- dicomParser is registered for parsing DICOM files
- HTML element is enabled for Cornerstone rendering

### 2. Frontend: DICOM Image Load Request

**Image Loading Trigger:**
```typescript
ngOnChanges(changes: SimpleChanges): void {
  if (changes['selectedImage'] && this.element) {
    // Reset state when image changes
    this.loadError = null;
    this.isImageLoaded = false;
    
    if (this.selectedImage) {
      console.log('Selected image changed, loading new image:', this.selectedImage);
      this.loadAndDisplayImage();
    }
  }
}
```

- When selectedImage input changes, loading process begins
- State is reset for the new image
- loadAndDisplayImage method is called to fetch the actual DICOM file

### 3. Frontend: DICOM Image Loading Process

**Image Loading Process:**
```typescript
loadAndDisplayImage(): void {
  if (!this.element || !this.selectedImage || !this.cornerstoneInitialized) {
    console.warn('Cannot load image - element, image, or cornerstone not initialized');
    this.loadError = 'DICOM viewer not properly initialized';
    return;
  }
  
  this.isLoading = true;
  this.loadError = null;
  
  // Clear any existing image
  try {
    cornerstone.reset(this.element);
  } catch (error) {
    console.warn('Error resetting cornerstone element:', error);
  }
  
  // Create the imageId for wado
  const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
  console.log('Loading DICOM image with imageId:', imageId);
  
  // Load and display the image
  cornerstone.loadAndCacheImage(imageId)
    .then(image => {
      console.log('DICOM image loaded successfully');
      this.displayImage(image);
      this.isLoading = false;
      this.isImageLoaded = true;
    })
    .catch(error => {
      console.error('Error loading DICOM image:', error);
      this.isLoading = false;
      this.loadError = 'Failed to load DICOM image. The file may be corrupted or in an unsupported format.';
    });
}
```

**Key Steps in This Process:**
1. Validation that all prerequisites are met
2. Set loading state to show progress indicator
3. Reset any existing image in the viewport
4. Create a WADO URI using the image's ID
5. Request image loading via Cornerstone
6. Upon success, display the image 
7. Handle success or failure with appropriate UI updates

### 4. Frontend: Image Display

**Displaying the Image:**
```typescript
private displayImage(image: cornerstone.Image): void {
  if (!this.element) return;
  
  try {
    // Display the image
    cornerstone.displayImage(this.element, image);
    
    // Set appropriate viewport parameters
    const viewport = cornerstone.getViewport(this.element);
    if (viewport) {
      viewport.voi = {
        windowWidth: image.windowWidth || 400,
        windowCenter: image.windowCenter || 200
      };
      cornerstone.setViewport(this.element, viewport);
    }
    
    // Enable mouse interactions
    this.enableMouseTools();
    
    console.log('DICOM image displayed successfully');
  } catch (error) {
    console.error('Error displaying DICOM image:', error);
    this.loadError = 'Failed to display DICOM image';
  }
}
```

- Image is rendered in the Cornerstone viewport
- Window/level values are set appropriately
- Mouse tools for interaction (zoom, pan) are enabled
- User can now view and interact with the image

### 5. Backend: API Controller (ImageController)

**DICOM File Retrieval:**
```csharp
[HttpGet("{id}")]
public async Task<ActionResult> GetDicomFile(int id)
{
    try
    {
        var dicomData = await _context.DicomData.FindAsync(id);
        
        if (dicomData == null)
        {
            _logger.LogWarning("Image not found: {Id}", id);
            return NotFound($"Image with ID {id} not found");
        }

        // Check if file exists
        if (!System.IO.File.Exists(dicomData.StoragePath))
        {
            _logger.LogError("DICOM file not found at path: {Path}", dicomData.StoragePath);
            return NotFound("DICOM file not found on the server");
        }

        _logger.LogInformation("Serving DICOM file: {FileName}, ID: {Id}", 
            dicomData.FileName, dicomData.Id);

        // Return the file with proper MIME type
        var fileBytes = await System.IO.File.ReadAllBytesAsync(dicomData.StoragePath);
        return File(fileBytes, "application/dicom", dicomData.FileName);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving DICOM file for ID: {Id}", id);
        return StatusCode(500, new { error = "Error retrieving DICOM file", message = ex.Message });
    }
}
```

**Key Features:**
1. Queries the DicomData table for the image record
2. Verifies the file exists on the filesystem
3. Reads the file bytes
4. Returns the file with the proper MIME type (application/dicom)
5. Logs actions for troubleshooting

## Metadata Flow in the Updated Architecture

In the updated architecture, most metadata is extracted on the client side during upload rather than during viewing. When viewing images:

1. The metadata is already available in the database from the upload process
2. The viewer retrieves and displays this metadata with the image
3. No separate metadata extraction is needed during viewing

This approach provides several advantages:
- Faster image display since metadata is pre-extracted
- Consistent metadata values across the application
- Reduced server-side processing during viewing
- Better user experience with immediate metadata availability

## User Interaction Features

### Viewport Tools

```typescript
private enableMouseTools(): void {
  // Enable mouse tools on the element
  cornerstoneTools.init();
  
  // Enable the element for tool usage
  cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
  cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
  cornerstoneTools.addTool(cornerstoneTools.PanTool);
  
  // Set the active tool
  cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
  cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
  cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 });
  
  console.log('Mouse tools enabled');
}
```

Cornerstone Tools provides several interaction modes:
1. **Window/Level Tool (Wwwc)**: Adjust brightness/contrast with left mouse button
2. **Zoom Tool**: Zoom in/out with middle mouse button or mousewheel
3. **Pan Tool**: Move the image around with right mouse button
4. Additional tools can be added for measurement, annotation, etc.

## Data Flow Summary

1. **Initial Load**:
   - Angular component initializes
   - Cornerstone libraries are prepared
   - User selects an image from gallery
   
2. **DICOM File Loading**:
   - Backend serves the raw DICOM file with proper MIME type
   - Cornerstone WADO Image Loader fetches and parses the file
   - Image is displayed in the viewport
   
3. **Rendering & Display**:
   - Cornerstone displays the image in the viewport
   - Image metadata is shown alongside the image
   - User can interact with the image (zoom, pan, etc.)

4. **Storage Architecture**:
   - DicomData table holds all metadata and file references
   - DICOM files stored on filesystem for efficient retrieval
   - Metadata is pre-extracted during upload

## Libraries and Technologies

### Cornerstone.js Ecosystem

**Core Libraries:**
- **cornerstone-core**: The main library for medical image display
- **cornerstone-wado-image-loader**: Loads DICOM images from WADO servers
- **dicom-parser**: Parses DICOM files into JavaScript objects

**How They Work Together:**
1. **dicom-parser**: Handles raw DICOM binary data parsing
2. **cornerstone-wado-image-loader**: Fetches and prepares DICOM images
3. **cornerstone-core**: Renders prepared images and manages viewport

### WADO URI Format

WADO (Web Access to DICOM Objects) is a standard for accessing DICOM objects over the web. The specific format used is:

```
wadouri:{url}
```

Where `{url}` is the URL to the DICOM file. This tells Cornerstone to use the WADO Image Loader to fetch and parse the DICOM file from the specified URL. 