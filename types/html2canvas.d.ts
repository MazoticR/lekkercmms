// types/html2canvas.d.ts
import "html2canvas";

declare module "html2canvas" {
  // Augment the existing options interface
  interface Html2CanvasOptions {
    scale?: number;
    dpi?: number;
  }
}
