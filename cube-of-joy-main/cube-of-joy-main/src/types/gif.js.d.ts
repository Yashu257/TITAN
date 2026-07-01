declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    transparent?: string | number | null;
    background?: string;
    dither?: boolean | string;
  }

  interface GIFFrame {
    copy?: boolean;
    delay?: number;
  }

  class GIF extends EventTarget {
    constructor(options: GIFOptions);
    
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D | ImageData,
      options?: GIFFrame
    ): void;
    
    render(): void;
    abort(): void;
    
    on(event: 'finished', handler: (blob: Blob) => void): void;
    on(event: 'progress', handler: (progress: number) => void): void;
    on(event: 'abort', handler: () => void): void;
    on(event: 'start', handler: () => void): void;
    on(event: 'error', handler: (error: Error) => void): void;
  }

  export default GIF;
}
