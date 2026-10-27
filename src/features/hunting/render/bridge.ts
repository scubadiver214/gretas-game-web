import type { Vec3 } from "../types";

export type CaptureCallback = (dataUrl: string | null) => void;
export type Projector = (p: Vec3) => { x: number; y: number } | null;

/**
 * The little bit of shared state between the React shell and the canvas: a
 * pending photo grab and a world-to-screen projector for score popups.
 */
export class CanvasBridge {
  private pending: CaptureCallback | null = null;
  private projector: Projector | null = null;

  requestCapture(cb: CaptureCallback): void {
    this.pending = cb;
  }

  takeCapture(): CaptureCallback | null {
    const cb = this.pending;
    this.pending = null;
    return cb;
  }

  setProjector(p: Projector | null): void {
    this.projector = p;
  }

  project(p: Vec3): { x: number; y: number } | null {
    return this.projector ? this.projector(p) : null;
  }
}
