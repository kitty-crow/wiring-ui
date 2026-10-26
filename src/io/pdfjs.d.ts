declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(options: { data: Uint8Array }): {
    promise: Promise<{
      getPage(index: number): Promise<{
        getViewport(options: { scale: number }): { width: number; height: number };
        render(options: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement; viewport: { width: number; height: number } }): { promise: Promise<void> };
      }>;
      destroy(): Promise<void>;
    }>;
  };
}
