import { FogExp2, Vector3, type Camera, type PerspectiveCamera, type Scene, type Texture, type WebGLRenderer } from "three";
import { EYE } from "../../config";
import type { HuntEngine } from "../../engine/HuntEngine";
import type { CanvasBridge, Projector } from "../bridge";
import { LAKESIDE } from "../world/palette";

export interface CameraKick {
  x: number;
  v: number;
}

export function setupCamera(camera: PerspectiveCamera): void {
  camera.rotation.order = "YXZ";
  camera.position.set(EYE.x, EYE.y, EYE.z);
}

export function kickCamera(kick: CameraKick, calm: boolean): void {
  kick.v += calm ? 0.12 : 0.35;
}

/** First-person camera from the engine's aim, with a small recoil kick and a smooth zoom. */
export function driveCamera(camera: PerspectiveCamera, engine: HuntEngine, kick: CameraKick, rawDt: number, calm: boolean): void {
  const dt = Math.min(rawDt, 0.05);
  kick.v += (-90 * kick.x - 13 * kick.v) * dt;
  kick.x += kick.v * dt;
  const breathe = calm ? 0 : Math.sin(engine.clock * 0.8) * 0.0015;
  camera.rotation.set(engine.aim.pitch + kick.x * 0.06 + breathe, engine.aim.yaw, 0);
  const fov = engine.fov;
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 14);
    camera.updateProjectionMatrix();
  }
}

export function fitViewCamera(camera: PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

export function setupScenes(scene: Scene, viewScene: Scene, env: Texture | null): void {
  scene.fog = new FogExp2(LAKESIDE.fog, LAKESIDE.fogDensity);
  scene.environment = env;
  scene.environmentIntensity = 0.6;
  viewScene.environment = env;
  // scene.environment ignores material.envMapIntensity; keep the sky out of the gun metal.
  viewScene.environmentIntensity = 0.28;
}

/** World pass, then a photo grab if one is waiting (no hands in it), then the viewmodel on a cleared depth buffer. */
export function renderFrame(gl: WebGLRenderer, scene: Scene, camera: Camera, viewScene: Scene, viewCamera: Camera, bridge: CanvasBridge, grab: HTMLCanvasElement | null): void {
  gl.autoClear = false;
  gl.clear();
  gl.render(scene, camera);
  const request = bridge.takeCapture();
  if (request) {
    try {
      const src = gl.domElement;
      const ch = src.height * 0.78;
      const cw = Math.min(src.width * 0.92, (ch * 4) / 3);
      if (!grab) throw new Error("no canvas");
      grab.width = 240;
      grab.height = 180;
      grab.getContext("2d")?.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, 240, 180);
      request(grab.toDataURL("image/jpeg", 0.78));
    } catch {
      request(null);
    }
  }
  gl.clearDepth();
  gl.render(viewScene, viewCamera);
}

export function makeProjector(camera: Camera): Projector {
  const v = new Vector3();
  return (p) => {
    v.set(p.x, p.y, p.z).project(camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * 100, y: (1 - (v.y * 0.5 + 0.5)) * 100 };
  };
}
