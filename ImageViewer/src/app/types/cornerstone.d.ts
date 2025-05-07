
//handles rendering and manipulating medical images
declare module 'cornerstone-core' {
  export interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    getPixelData: () => Uint8Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    rgba: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    invert: boolean;
    sizeInBytes: number;
  }

  //Defines how the image is shown (zoom, brightness, contrast, flip, etc)
  export interface Viewport {
    scale: number;
    translation: {
      x: number;
      y: number;
    };
    voi: {
      windowWidth: number;
      windowCenter: number;
    };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
  }

  export function enable(element: HTMLElement): void;
  export function disable(element: HTMLElement): void;
  export function displayImage(element: HTMLElement, image: Image, viewport?: Viewport): void;
  export function getViewport(element: HTMLElement): Viewport;
  export function setViewport(element: HTMLElement, viewport: Viewport): void;
  //Loads and caches a DICOM image from a URI (imageId), returns a promise of Image
  export function loadAndCacheImage(imageId: string): Promise<Image>;
  export function reset(element: HTMLElement): void;
  export function getDefaultViewport(element: HTMLElement, image: Image): Viewport;
}

// loads DICOM images via WADO-URI
declare module 'cornerstone-wado-image-loader' {
  export const external: {
    cornerstone: any;
    dicomParser: any;
  };
  
  export function configure(options: any): void;
}

declare module 'dicom-parser' {
  export function parseDicom(byteArray: Uint8Array): any;
} 