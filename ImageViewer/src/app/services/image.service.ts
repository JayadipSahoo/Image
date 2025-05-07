import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

export interface DicomImage {
  id: number;
  name: string;
  createdAt?: Date;
  patientId?: string;
  patientName?: string;
  patientBirthDate?: string;
  patientSex?: string;
  modality?: string;
  rows?: number;
  columns?: number;
  imageType?: string;
  studyId?: string;
  studyInstanceUid?: string;
  studyDate?: string;
  studyTime?: string;
  seriesInstanceUid?: string;
  seriesNumber?: string;
  seriesDescription?: string;
  bodyPart?: string;
  windowCenter?: string;
  windowWidth?: string;
  instanceNumber?: string;
  sopInstanceUid?: string;
  url?: string;          // Image URL
  fileSize?: number;     // Image size in bytes
  uploadDate?: Date;     // Upload date
  contentType?: string; 
}

// Interface for DICOM metadata extracted by Cornerstone WADO
export interface DicomMetadata {
  patientName?: string | null;
  patientId?: string | null;
  patientBirthDate?: string | null;
  patientSex?: string | null;
  modality?: string | null;
  rows?: number | null;
  columns?: number | null;
  imageType?: string | null;
  studyId?: string | null;
  studyInstanceUid?: string | null;
  studyDate?: string | null;
  studyTime?: string | null;
  seriesInstanceUid?: string | null;
  seriesNumber?: string | null;
  seriesDescription?: string | null;
  bodyPart?: string | null;
  windowCenter?: string | null;
  windowWidth?: string | null;
  instanceNumber?: string | null;
  sopInstanceUid?: string | null;
  hasAnnotations?: boolean;
  annotationType?: string | null;
  annotationLabel?: string | null;
  annotationData?: string | null;
}

interface DicomCornerstoneImage extends cornerstone.Image {
  data?: {
    string?: (tag: string) => string | undefined;
    uint16?: (tag: string) => number | undefined;
    elements?: any;
  };
}

// DICOM Tag mappings for easy reference
const DicomTags = {
  // Patient Module
  PatientName: 'x00100010',
  PatientID: 'x00100020',
  PatientBirthDate: 'x00100030',
  PatientSex: 'x00100040',
  
  // General Study Module
  StudyInstanceUID: 'x0020000D',
  StudyDate: 'x00080020',
  StudyTime: 'x00080030',
  StudyID: 'x00200010',
  AccessionNumber: 'x00080050',
  StudyDescription: 'x00081030',
  
  // General Series Module
  Modality: 'x00080060',
  SeriesInstanceUID: 'x0020000E',
  SeriesNumber: 'x00200011',
  SeriesDescription: 'x0008103E',
  BodyPartExamined: 'x00180015',
  
  // Image Pixel Module
  Rows: 'x00280010',
  Columns: 'x00280011',
  BitsAllocated: 'x00280100',
  BitsStored: 'x00280101',
  HighBit: 'x00280102',
  PixelRepresentation: 'x00280103',
  SamplesPerPixel: 'x00280002',
  PhotometricInterpretation: 'x00280004',
  
  // General Image Module
  InstanceNumber: 'x00200013',
  ImageType: 'x00080008',
  AcquisitionDate: 'x00080022',
  AcquisitionTime: 'x00080032',
  
  // SOP Common Module
  SOPInstanceUID: 'x00080018',
  SOPClassUID: 'x00080016',
  
  // VOI LUT Module
  WindowCenter: 'x00281050',
  WindowWidth: 'x00281051'
};

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:5028/api/image';  // Direct backend URL
  private images = new BehaviorSubject<DicomImage[]>([]);

  constructor(private http: HttpClient) {
    this.loadImages();
    this.initCornerstoneWADO();
  }

  private initCornerstoneWADO(): void {
    // Configure cornerstone for metadata extraction
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    // Remove WebWorker initialization code - it's causing errors
    // Cornerstone will use default settings without web workers
    
    console.log('Cornerstone WADO Image Loader initialized in service');
  }

  loadImages() {
    this.http.get<DicomImage[]>(this.apiUrl)
      .subscribe({
        next: (images) => {
          console.log('DICOM images loaded from server:', images);
          this.images.next(images);
        },
        error: (error) => {
          console.error('Error loading DICOM images from server:', error);
          this.images.next([]);
        }
      });
  }

  getImages(): Observable<DicomImage[]> {
    return this.images.asObservable();
  }

  uploadImages(files: File[]): Observable<DicomImage[]> {
    console.log('Starting upload process for', files.length, 'DICOM files');
    
    // Create an array of upload observables
    const uploadObservables = files.map(file => {
      return this.uploadSingleFile(file);
    });

    // Use forkJoin to process all uploads in parallel
    return forkJoin(uploadObservables).pipe(
      map(results => results.filter((result): result is DicomImage => result !== null)),
      tap(successfulUploads => {
        console.log('All uploads completed. Successful uploads:', successfulUploads.length);
        
        if (successfulUploads.length > 0) {
          const currentImages = this.images.value;
          const updatedImages = [...currentImages, ...successfulUploads];
          this.images.next(updatedImages);
        }
      })
    );
  }

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
          
          // Log the first 50 bytes for debugging
          console.log('First 50 bytes:', Array.from(byteArray.slice(0, 50)));
          
          // Check for DICOM magic header (DICM) at offset 128
          const hasDicomHeader = byteArray.length > 132 && 
                              byteArray[128] === 68 && // 'D'
                              byteArray[129] === 73 && // 'I'
                              byteArray[130] === 67 && // 'C'
                              byteArray[131] === 77;   // 'M'
          
          console.log(`File has DICOM header: ${hasDicomHeader}`);
          
          try {
            // Parse the DICOM file
            const dataSet = dicomParser.parseDicom(byteArray);
            console.log('DICOM dataset parsed successfully');
            
            if (dataSet && dataSet.elements) {
              console.log(`Found ${Object.keys(dataSet.elements).length} DICOM elements`);
              
              // Dump some raw tag values for debugging
              Object.keys(dataSet.elements).slice(0, 10).forEach(tag => {
                try {
                  console.log(`Tag ${tag}: ${dataSet.string(tag)}`);
                } catch (e) {
                  console.log(`Tag ${tag}: <binary data>`);
                }
              });
              
              // Extract and log patient name for verification
              const patientName = dataSet.string('x00100010');
              const patientID = dataSet.string('x00100020');
              console.log(`Patient name from DICOM: ${patientName}, ID: ${patientID}`);
              
              const metadata = this.extractMetadataFromDataset(dataSet);
              console.log('Final extracted metadata:', metadata);
              
              // Only proceed with valid metadata
              if (metadata && Object.values(metadata).some(val => val !== null && val !== undefined)) {
                observer.next(metadata);
                observer.complete();
                return;
              }
            }
            
            console.warn('Could not extract valid metadata from DICOM dataset');
            observer.next(null);
            observer.complete();
          } catch (parseError) {
            console.error('Error parsing DICOM file:', parseError);
            observer.next(null);
            observer.complete();
          }
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

  private extractMetadataFromDataset(dataset: any): DicomMetadata {
    try {
      const metadata: DicomMetadata = {};
      
      // Log all available tags for debugging
      if (dataset.elements) {
        console.log('Available DICOM tags:');
        Object.keys(dataset.elements).forEach(tag => console.log(tag));
      }
      
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
      
      // Helper function to get numeric value with more debugging
      const getUint16 = (tag: string, description: string): number | null => {
        try {
          if (dataset.elements[tag]) {
            const value = dataset.uint16(tag);
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
      metadata.rows = getUint16(DicomTags.Rows, 'Rows');
      metadata.columns = getUint16(DicomTags.Columns, 'Columns');
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

  deleteImage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        console.log('DICOM image deleted successfully:', id);
        const currentImages = this.images.value;
        const updatedImages = currentImages.filter(img => img.id !== id);
        this.images.next(updatedImages);
      })
    );
  }

  getDicomImageUrl(id: number): string {
    return `${this.apiUrl}/${id}`;
  }
}
