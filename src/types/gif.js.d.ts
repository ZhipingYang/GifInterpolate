declare module 'gif.js' {
  export interface GifOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    dither?: boolean;
    debug?: boolean;
    repeat?: number;
    transparent?: string | number[];
  }

  export interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options?: GifOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement, 
      options?: GifFrameOptions
    ): void;
    on(event: string, callback: (blob: Blob) => void): void;
    render(): void;
    abort(): void;
  }
} 