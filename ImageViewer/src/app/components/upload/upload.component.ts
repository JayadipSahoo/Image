import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageService } from '../../services/image.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './upload.Component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private imageService: ImageService,
    private router: Router
  ) {}
  
  handleFileSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No files selected';
      return;
    }

    this.uploadDicomFiles(Array.from(input.files));
  }

  handleFolderSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No folder selected';
      return;
    }

    this.loading = true;
    this.error = null;

    const files = Array.from(input.files).filter(file => 
      file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom'
    );

    if (files.length === 0) {
      this.error = 'No DICOM files found in the selected folder';
      this.loading = false;
      return;
    }

    this.uploadDicomFiles(files);
  }
  
  private uploadDicomFiles(files: File[]) {
    this.loading = true;
    this.error = null;
    
    console.log(`Attempting to upload ${files.length} DICOM files`);
    files.forEach(file => {
      console.log(`DICOM file to upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    });

    // Upload the files using the ImageService
    this.imageService.uploadImages(files).subscribe({
      next: (images) => {
        console.log('Upload response:', images);
        if (images && images.length > 0) {
          console.log(`Successfully uploaded ${images.length} DICOM images`);
          this.router.navigate(['/gallery']);
        } else {
          this.error = 'No DICOM images were uploaded successfully';
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        if (error.status === 413) {
          this.error = 'Files are too large. Please try uploading fewer or smaller DICOM files.';
        } else if (error.status === 415) {
          this.error = 'Unsupported file type. Please ensure all files are valid DICOM (.dcm) files.';
        } else if (error.status === 0) {
          this.error = 'Cannot connect to the server. Please check your connection.';
        } else {
          this.error = `Upload failed: ${error.message || 'Unknown error'}`;
        }
      },
      complete: () => {
        this.loading = false;
        console.log('Upload operation completed');
      }
    });
  }
}
