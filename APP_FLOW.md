# DICOM Image Viewer Application Flow

## Overview

This document explains the complete flow of the DICOM Image Viewer application, from initial startup through image loading, selection, display, and metadata management. It demonstrates how Angular's dependency injection and the Observable pattern work together to create a responsive application with consolidated metadata handling.

## Visual Flow Diagram

```
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  App Bootstrap      │────>│  Image Service    │────>│  Backend API    │
│  (AppModule)        │     │  Initialization   │     │  (HTTP GET)     │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
                                     │                         │
                                     │                         │
                                     │                         │
                                     ▼                         │
┌─────────────────────┐     ┌───────────────────┐             │
│                     │     │                   │             │
│  Gallery Component  │<────│  BehaviorSubject  │<────────────┘
│  (Display Images)   │     │  (Image List)     │  Images Array
│                     │     │                   │
└─────────────────────┘     └───────────────────┘
         │
         │ User selects image
         │
         ▼
┌─────────────────────┐
│                     │
│  DICOM Viewer       │
│  Component          │
│  (Display Image)    │
│                     │
└─────────────────────┘
         │
         │ Load DICOM file
         ▼
┌─────────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                     │     │                   │     │                 │
│  Cornerstone.js     │────>│  WADO Image       │────>│  Backend API    │
│  (Render DICOM)     │     │  Loader           │     │  (Get DICOM)    │
│                     │     │                   │     │                 │
└─────────────────────┘     └───────────────────┘     └─────────────────┘
         │                                                    │
         │                                                    │
         ▼                                                    │
┌─────────────────────┐                                       │
│                     │                                       │
│  Display Image      │<──────────────────────────────────────┘
│  & Metadata         │  
│                     │
└─────────────────────┘
```

## Detailed Process Flow

### 1. Application Startup

When the Angular application starts, the following process takes place:

```typescript
// Root module initialization (app.module.ts)
@NgModule({
  declarations: [...],
  imports: [...],
  providers: [ImageService], // Service is registered here
  bootstrap: [AppComponent]
})
export class AppModule { }
```

**Key Steps:**
1. Angular bootstraps the application
2. Angular's dependency injection system prepares to inject services
3. `ImageService` is instantiated when first requested (lazy initialization)

### 2. ImageService Initialization

When the `ImageService` is first injected into any component, its constructor runs:

```typescript
// image.service.ts
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:5028/api/image';
  private images = new BehaviorSubject<DicomImage[]>([]);

  constructor(private http: HttpClient) {
    this.loadImages(); // Initial server request
    this.initCornerstoneWADO(); // Initialize DICOM libraries
  }
  
  // ...
}
```

**Key Steps:**
1. `BehaviorSubject` is created with an empty array as initial value
2. Constructor calls `loadImages()` method and initializes Cornerstone libraries
3. HTTP request is made to the backend API

### 3. Initial Data Loading

The `loadImages()` method in the service makes an HTTP request and updates the BehaviorSubject:

```typescript
// image.service.ts
loadImages() {
  this.http.get<DicomImage[]>(this.apiUrl)
    .subscribe({
      next: (images) => {
        console.log('DICOM images loaded from server:', images);
        this.images.next(images);  // <-- Updates the BehaviorSubject
      },
      error: (error) => {
        console.error('Error loading DICOM images from server:', error);
        this.images.next([]);
      }
    });
}
```

**Key Steps:**
1. HTTP GET request is made to the backend API
2. When response arrives, the `next()` method is called on the BehaviorSubject
3. All subscribers to the BehaviorSubject are notified with the new image list

### 4. Gallery Component Initialization

When the GalleryComponent is loaded, it subscribes to the ImageService:

```typescript
// gallery.component.ts
export class GalleryComponent implements OnInit {
  allImages: DicomImage[] = [];
  selectedImage: DicomImage | null = null;

  constructor(public imageService: ImageService) {}

  ngOnInit() {
    this.loadImages();
  }

  loadImages() {
    this.imageService.getImages().subscribe(images => {
      this.allImages = images;
      console.log('Loaded DICOM images:', images);
    });
  }
  
  // ...
}
```

**Key Steps:**
1. Component's `ngOnInit` lifecycle hook calls `loadImages()`
2. Component subscribes to the service's Observable via `getImages()`
3. If the BehaviorSubject already has data (from step 3), it immediately receives it
4. Component updates its `allImages` property with the received data
5. Angular's change detection renders the gallery view with the images

### 5. Image Selection Process

When a user clicks on an image in the gallery:

```typescript
// gallery.component.ts
selectImage(image: DicomImage) {
  this.selectedImage = image;
}
```

**Key Steps:**
1. User clicks an image in the UI
2. Click event calls `selectImage()` method
3. Component updates `selectedImage` property
4. Angular's change detection triggers updates in the view
5. The DicomViewerComponent receives the selected image via its @Input property

### 6. DICOM Image Loading and Display

The DicomViewerComponent loads and displays the DICOM image:

```typescript
// dicom-viewer.component.ts
ngOnChanges(changes: SimpleChanges): void {
  if (changes['selectedImage'] && this.element) {
    // Reset state when image changes
    this.loadError = null;
    this.isImageLoaded = false;
    
    if (this.selectedImage) {
      this.loadAndDisplayImage();
    }
  }
}

loadAndDisplayImage(): void {
  // ... setup code ...
  
  // Create the imageId for wado
  const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
  
  // Load and display the image
  cornerstone.loadAndCacheImage(imageId)
    .then(image => {
      this.displayImage(image);
      // ... state updates ...
    })
    .catch(error => {
      // ... error handling ...
    });
}
```

**Key Steps:**
1. Component detects a new selected image
2. Creates a WADO URI for the DICOM file
3. Cornerstone.js loads the file via HTTP
4. Image is displayed in the viewport using Cornerstone

## New Client-Side Metadata Extraction Flow

### 1. Upload Process with Metadata Extraction

When uploading files, metadata is now extracted in the browser before sending to server:

```typescript
// image.service.ts
uploadImages(files: File[]): Observable<DicomImage[]> {
  // Create an array of upload observables
  const uploadObservables = files.map(file => {
    return this.uploadSingleFile(file);
  });

  // Use forkJoin to process all uploads in parallel
  return forkJoin(uploadObservables).pipe(
    map(results => results.filter((result): result is DicomImage => result !== null)),
    tap(successfulUploads => {
      if (successfulUploads.length > 0) {
        const currentImages = this.images.value;
        const updatedImages = [...currentImages, ...successfulUploads];
        this.images.next(updatedImages);
      }
    })
  );
}

private uploadSingleFile(file: File): Observable<DicomImage | null> {
  // Extract DICOM metadata before uploading
  return this.extractMetadataFromFile(file).pipe(
    switchMap(metadata => {
      // Create FormData with file and metadata
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      return this.http.post<DicomImage>(`${this.apiUrl}/upload`, formData);
    }),
    catchError(error => {
      console.error(`Error uploading ${file.name}:`, error);
      return of(null);
    })
  );
}
```

### 2. Metadata Extraction Process

The frontend now extracts metadata directly from DICOM files during upload:

```typescript
// image.service.ts
private extractMetadataFromFile(file: File): Observable<DicomMetadata | null> {
  return new Observable<DicomMetadata | null>(observer => {
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        observer.next(null);
        observer.complete();
        return;
      }
      
      try {
        const byteArray = new Uint8Array(arrayBuffer);
        
        // Check for DICOM magic header (DICM) at offset 128
        const hasDicomHeader = byteArray.length > 132 && 
                             byteArray[128] === 68 && // 'D'
                             byteArray[129] === 73 && // 'I'
                             byteArray[130] === 67 && // 'C'
                             byteArray[131] === 77;   // 'M'
        
        if (hasDicomHeader) {
          // Parse the DICOM file
          const dataSet = dicomParser.parseDicom(byteArray);
          if (dataSet && dataSet.elements) {
            const metadata = this.extractMetadataFromDataset(dataSet);
            observer.next(metadata);
            observer.complete();
            return;
          }
        }
        
        observer.next(null);
        observer.complete();
      } catch (error) {
        console.error('Error processing DICOM file:', error);
        observer.next(null);
        observer.complete();
      }
    };
    
    fileReader.readAsArrayBuffer(file);
  });
}
```

### 3. Detailed Metadata Extraction

The service extracts specific DICOM tags using a mapping object:

```typescript
// image.service.ts
private extractMetadataFromDataset(dataset: any): DicomMetadata {
  try {
    const metadata: DicomMetadata = {};
    
    // Helper function to get string from dataset
    const getString = (tag: string, description: string): string | null => {
      try {
        if (dataset.elements[tag]) {
          const value = dataset.string(tag);
          return value || null;
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
    
    // ... additional metadata extraction ...
    
    return metadata;
  } catch (error) {
    console.error('Error extracting DICOM metadata from dataset:', error);
    return {};
  }
}
```

## Understanding BehaviorSubject and The Observer Pattern

### What is a BehaviorSubject?

A `BehaviorSubject` is a special type of RxJS Subject that:
1. Requires an initial value when created
2. Emits its current value to new subscribers
3. Maintains a "current value" that can be accessed anytime
4. Notifies all subscribers when that value changes

### Why Use This Pattern?

The BehaviorSubject pattern is ideal for managing application state because:

1. **Decoupling**: Components don't need to know where the data comes from
2. **Caching**: The service can cache data and avoid repeated HTTP requests
3. **Reactivity**: Components automatically update when data changes
4. **Consistency**: All components see the same data at the same time
5. **Late subscribers**: Components can subscribe at any time and get current data

### Real-world Analogy

Think of a BehaviorSubject like a news bulletin board in a town square:

1. When first installed, it starts with an initial notice (initial value)
2. New people who visit the square immediately see the current notices (new subscribers get current value)
3. When new notices are posted (calling `next()`), everyone in the square is alerted
4. People can come and go, but the board always shows the latest notices
5. The town clerk can check what's currently posted without waiting for updates (getValue())

## Summary of Complete Application Flow

1. **Startup**:
   - App bootstraps
   - ImageService initializes
   - Initial HTTP request made
   - BehaviorSubject updated with image list

2. **Gallery Viewing**:
   - Gallery component subscribes to image list
   - Images displayed in UI
   - User views available DICOM images

3. **Image Selection**:
   - User clicks an image
   - Selected image passed to DICOM viewer
   - Viewer begins loading process

4. **DICOM Viewing**:
   - Specific DICOM file requested from server
   - File loaded and parsed by Cornerstone.js
   - Image rendered in viewport
   - User can interact with image (zoom, pan)

5. **Upload Process**:
   - User selects file(s) to upload
   - Client extracts metadata from DICOM file directly in browser
   - File and extracted metadata sent to server
   - Backend stores file and metadata in database
   - Gallery view updated with new images

This updated flow creates a more robust and maintainable application architecture with enhanced metadata handling on the client side. 