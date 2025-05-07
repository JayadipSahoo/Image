import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ImageService, DicomImage } from '../../services/image.service';
import { BehaviorSubject } from 'rxjs';
import { DicomViewerComponent } from '../dicom-viewer/dicom-viewer.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    DicomViewerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css'],
})
export class GalleryComponent implements OnInit {
  allImages: DicomImage[] = [];
  selectedImage: DicomImage | null = null;

  constructor(public imageService: ImageService) {}

  ngOnInit() {
    this.loadImages();
  }
  //reading the images from the ImageService BehaviorSubject 
//Get images from ImageService
  loadImages() {
    this.imageService.getImages().subscribe(images => {
      this.allImages = images;//retrurns all saved dicom img
      console.log('Loaded DICOM images:', images);
    });
  }
//ets the selectedImage property to the provided image
  selectImage(image: DicomImage) {
    this.selectedImage = image;
  }

  clearSelected() {
    this.selectedImage = null;
  }

  deleteImage(image: DicomImage) {
    if (confirm(`Are you sure you want to delete DICOM image: ${image.name}?`)) {
      this.imageService.deleteImage(image.id).subscribe({
        next: () => {
          if (this.selectedImage?.id === image.id) {
            this.selectedImage = null;
          }
        },
        error: error => {
          console.error('Error deleting DICOM image:', error);
        }
      });
    }
  }
//upload .dcm file
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      // Only allow DICOM files
      const dicomFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom'
      );
      
      if (dicomFiles.length === 0) {
        alert('Please select valid DICOM files (.dcm)');
        return;
      }
      
      if (dicomFiles.length !== files.length) {
        alert(`Only ${dicomFiles.length} of ${files.length} files are valid DICOM files and will be uploaded.`);
      }
      
      this.imageService.uploadImages(dicomFiles).subscribe({
        next: (uploadedImages) => {
          console.log('Successfully uploaded DICOM images:', uploadedImages);
          if (uploadedImages.length > 0) {
            // Select the first uploaded image
            this.selectImage(uploadedImages[0]);
          }
        },
        error: (error) => {
          console.error('Error uploading DICOM images:', error);
        }
      });
    }
  }
}

