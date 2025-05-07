import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DicomImage, ImageService } from '../../services/image.service';

// Import Cornerstone libraries
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';

@Component({
  selector: 'app-dicom-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dicom-viewer.html',
  styleUrls: ['./dicom-viewer.css']
})
export class DicomViewerComponent implements AfterViewInit, OnChanges {
  @Input() selectedImage: DicomImage | null = null;
  @ViewChild('dicomContainer') dicomContainer!: ElementRef; //used to access a DOM element
  
  private element: HTMLElement | null = null;
  private viewport: cornerstone.Viewport | null = null;
  private cornerstoneInitialized = false;
  
  isLoading = false;
  isImageLoaded = false;
  loadError: string | null = null;

  constructor(private imageService: ImageService, private ngZone: NgZone) {
    // Initialize cornerstone and its dependencies
    this.initCornerstoneWADOImageLoader();
  }
//runs after the component's view (HTML template) is fully initialized 
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - dicomContainer:', this.dicomContainer);
    if (this.dicomContainer && this.dicomContainer.nativeElement) {
      this.element = this.dicomContainer.nativeElement;
      console.log('Element initialized:', this.element);
      this.initCornerstoneElement();
      
      // Wait until the next tick to load images to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        if (this.selectedImage) {
          this.loadAndDisplayImage();
        }
      });
    } else {
      console.error('dicomContainer not found or not initialized properly');
      this.loadError = 'Failed to initialize viewer - element not found';
    }
  }
// called every time an @Input() property changes
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedImage'] && this.element) { //check new img is passed
      // Reset state when image changes
      this.loadError = null;
      this.isImageLoaded = false;
      
      if (this.selectedImage) {
        // Use ngZone.runOutsideAngular for cornerstone operations
        // to avoid change detection issues
        this.ngZone.runOutsideAngular(() => {
          this.loadAndDisplayImage();
        });
      }
    }
  }
  
//connects the cornerstone library and dicomParser to the cornerstoneWADOImageLoader
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
//prepares the div,CS can display medical images inside it
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
//load ad display selected img inside html element
  loadAndDisplayImage(): void {
    if (!this.element || !this.selectedImage || !this.cornerstoneInitialized) {
      console.warn('Cannot load image - element, image, or cornerstone not initialized');
      this.ngZone.run(() => {
        this.loadError = 'DICOM viewer not properly initialized';
      });
      return;
    }
    
    // Set loading state inside NgZone to trigger proper change detection
    this.ngZone.run(() => {
      this.isLoading = true;
      this.loadError = null;
    });
    
    // Clear any existing image
    try {
      cornerstone.reset(this.element);
    } catch (error) {
      console.warn('Error resetting cornerstone element:', error);
    }
    
    // Create the imageId for wado
    //wadouri:http://localhost:5028/api/image/123
    const imageId = `wadouri:${this.imageService.getDicomImageUrl(this.selectedImage.id)}`;
    console.log('Loading DICOM image with imageId:', imageId);
    
    // Load and display the image
    cornerstone.loadAndCacheImage(imageId)
      .then(image => {
        console.log('DICOM image loaded successfully');
        this.displayImage(image);
        
        // Update state within NgZone to ensure proper change detection
        this.ngZone.run(() => {
          this.isLoading = false;
          this.isImageLoaded = true;
        });
      })
      .catch(error => {
        console.error('Error loading DICOM image:', error);
        
        // Update state within NgZone to ensure proper change detection
        this.ngZone.run(() => {
          this.isLoading = false;
          this.loadError = 'Failed to load DICOM image. The file may be corrupted or in an unsupported format.';
        });
      });
  }

  //display dicom image on the viewer
  //Draws the given DICOM image onto your HTML <div>.
  displayImage(image: cornerstone.Image): void {
    if (!this.element) return;

    try {
      // Display the image
      cornerstone.displayImage(this.element, image);
      
      // Get the current viewport and ensure it's properly initialized(zoom)
      this.viewport = cornerstone.getViewport(this.element);
      
      // Fit the image to the viewport initially
      this.viewport.scale = 1.0;
      this.viewport.translation.x = 0;
      this.viewport.translation.y = 0;
      cornerstone.setViewport(this.element, this.viewport);
      
      // Add border style to show the container boundaries
      this.element.style.border = "1px solid #333";
      
      console.log('DICOM image displayed successfully');
      
      // Update isImageLoaded within NgZone
      this.ngZone.run(() => {
        this.isImageLoaded = true;
      });
    } catch (error) {
      console.error('Error displaying DICOM image:', error);
      
      // Update error state within NgZone
      this.ngZone.run(() => {
        this.loadError = 'Failed to display DICOM image';
        this.isImageLoaded = false;
      });
    }
  }

  zoomIn(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale += 0.25;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  }

  zoomOut(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale -= 0.25;
      if (this.viewport.scale < 0.25) this.viewport.scale = 0.25;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  }

  resetView(): void {
    if (!this.element || !this.viewport) return;
    
    try {
      this.viewport.scale = 1;
      this.viewport.translation.x = 0;
      this.viewport.translation.y = 0;
      cornerstone.setViewport(this.element, this.viewport);
    } catch (error) {
      console.error('Error resetting view:', error);
    }
  }

  retryLoad(): void {
    if (this.selectedImage) {
      this.ngZone.runOutsideAngular(() => {
        this.loadAndDisplayImage();
      });
    }
  }
} 