import { AdditiveBlending, DirectionalLight, Group, HemisphereLight, PointLight, Quaternion, Sprite, SpriteMaterial, Vector3, type Camera, type CanvasTexture, type Material } from "three";
import { CAMERA_ZOOMS } from "../../config";
import type { HuntEngine } from "../../engine/HuntEngine";
import type { HuntEvent } from "../../types";
import { disposeTree } from "../geo";
import { createPhotoCamera, type CameraRig } from "../models/photoCamera";
import { createShotgun, createViewmodelMaterials, shellMesh, type GunRig, type ViewmodelMaterials } from "../models/shotgun";
import { flashTexture, smokeTexture, woodTexture } from "../textures";
import { LAKESIDE, SUN_VECTOR } from "../world/palette";

const HIP = { x: 0.15, y: -0.188, z: -0.47, rx: 0.035, ry: 0.085 };
const ADS = { x: 0.0, y: -0.06, z: -0.26, rx: 0.0, ry: 0.0 };
const CAM_POSE = { x: 0.15, y: -0.215, z: -0.44, ry: -0.22 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

interface Spring {
  x: number;
  v: number;
}
function spring(s: Spring, target: number, k: number, damp: number, dt: number) {
  s.v += (k * (target - s.x) - damp * s.v) * dt;
  s.x += s.v * dt;
}

const _q = new Quaternion();
const _v = new Vector3();

/**
 * The first-person gun / camera with hands, its lights, muzzle flash, smoke and
 * ejected shells. Lives in its own scene, drawn after the world.
 */
export class ViewmodelSystem {
  readonly root = new Group();
  private textures: CanvasTexture[];
  private m: ViewmodelMaterials;
  private gun: GunRig;
  private cam: CameraRig;
  private shells: { g: Group; t: number; v: Vector3; w: Vector3 }[];
  private flash: Sprite;
  private flashMat: SpriteMaterial;
  private smoke: { s: Sprite; mat: SpriteMaterial; t: number; v: Vector3 }[];
  private light = new PointLight("#ffcf7a", 0, 1.2, 2);
  private sun = new DirectionalLight(LAKESIDE.sun, 2.6);
  private a = {
    kickZ: { x: 0, v: 0 } as Spring,
    kickR: { x: 0, v: 0 } as Spring,
    swayX: { x: 0, v: 0 } as Spring,
    swayY: { x: 0, v: 0 } as Spring,
    ads: 0,
    reload: 0,
    bump: 0,
    flashT: 1,
    camPush: 0,
    lens: 1,
    lastYaw: 0,
    lastPitch: 0,
  };

  constructor(skin: string, sleeve: string) {
    const wood = woodTexture();
    const flashTex = flashTexture();
    const smokeTex = smokeTexture();
    this.textures = [wood, flashTex, smokeTex];
    this.m = createViewmodelMaterials({ skin, sleeve, wood });
    this.gun = createShotgun(this.m);
    this.cam = createPhotoCamera(this.m);
    this.shells = Array.from({ length: 4 }, () => {
      const g = shellMesh(this.m);
      g.visible = false;
      return { g, t: -1, v: new Vector3(), w: new Vector3() };
    });
    this.flashMat = new SpriteMaterial({ map: flashTex, blending: AdditiveBlending, depthWrite: false, transparent: true, color: "#fff3cf" });
    this.flash = new Sprite(this.flashMat);
    this.flash.visible = false;
    this.smoke = Array.from({ length: 6 }, () => {
      const mat = new SpriteMaterial({ map: smokeTex, depthWrite: false, transparent: true, opacity: 0 });
      const s = new Sprite(mat);
      s.visible = false;
      return { s, mat, t: -1, v: new Vector3() };
    });
    this.root.add(new HemisphereLight(LAKESIDE.hemiSky, LAKESIDE.hemiGround, 0.9), this.sun, this.light, this.gun.root, this.cam.root, this.flash);
    for (const s of this.shells) this.root.add(s.g);
    for (const s of this.smoke) this.root.add(s.s);
  }

  onEvent(e: HuntEvent, calm: boolean): void {
    const a = this.a;
    if (e.type === "shot" && e.tool === "shotgun") {
      a.kickZ.v += calm ? 0.9 : 1.7;
      a.kickR.v += calm ? 3 : 6.5;
      a.flashT = 0;
      this.flashMat.rotation = Math.random() * Math.PI;
      this.gun.muzzle.getWorldPosition(_v);
      this.smoke.forEach((s, i) => {
        if (i > 2) return;
        s.t = i * 0.03;
        s.s.position.copy(_v);
        s.v.set((Math.random() - 0.5) * 0.06, 0.05 + Math.random() * 0.05, -0.12 - Math.random() * 0.1);
      });
    } else if (e.type === "shot" && e.tool === "camera") {
      a.camPush = 1;
    } else if (e.type === "eject") {
      const shell = this.shells.find((s) => s.t < 0);
      if (shell) {
        this.gun.ejectPort.getWorldPosition(shell.g.position);
        shell.t = 0;
        shell.v.set(0.9 + Math.random() * 0.3, 0.9 + Math.random() * 0.3, 0.25);
        shell.w.set(Math.random() * 12, Math.random() * 6, 14 + Math.random() * 6);
        shell.g.visible = true;
      }
    } else if (e.type === "shellIn") {
      a.bump = 1;
    }
  }

  update(rawDt: number, engine: HuntEngine, mainCamera: Camera, calm: boolean): void {
    const dt = Math.min(rawDt, 0.05);
    const a = this.a;
    const gun = this.gun;
    const camRig = this.cam;

    const dYaw = engine.aim.yaw - a.lastYaw;
    const dPitch = engine.aim.pitch - a.lastPitch;
    a.lastYaw = engine.aim.yaw;
    a.lastPitch = engine.aim.pitch;
    const swayAmt = calm ? 0.3 : 1;
    spring(a.swayX, Math.max(-0.06, Math.min(0.06, dYaw * 2.2)) * swayAmt, 90, 12, dt);
    spring(a.swayY, Math.max(-0.05, Math.min(0.05, -dPitch * 2.2)) * swayAmt, 90, 12, dt);
    spring(a.kickZ, 0, 160, 15, dt);
    spring(a.kickR, 0, 140, 13, dt);
    a.ads = lerp(a.ads, engine.ads ? 1 : 0, Math.min(1, dt * 12));
    a.reload = lerp(a.reload, engine.weapon === "reloading" ? 1 : 0, Math.min(1, dt * 9));
    a.bump = Math.max(0, a.bump - dt * 6);
    a.camPush = Math.max(0, a.camPush - dt * 5);
    a.flashT += dt;

    let lower = 0;
    if (engine.weapon === "swapping" && engine.weaponLen > 0) {
      const t = engine.weaponT / engine.weaponLen;
      lower = ease(t < 0.5 ? t / 0.5 : (1 - t) / 0.5);
    }
    const hidden = !(engine.phase === "playing" || engine.phase === "countdown" || engine.phase === "paused");
    const breathe = calm ? 0 : Math.sin(engine.clock * 1.6) * 0.0035;
    const drift = calm ? 0 : Math.sin(engine.clock * 0.9) * 0.002;
    const showGun = engine.tool === "shotgun";
    gun.root.visible = showGun && !hidden;
    camRig.root.visible = !showGun && !hidden;

    if (showGun) {
      const p = a.ads;
      gun.root.position.set(
        lerp(HIP.x, ADS.x, p) + a.swayX.x * (1 - p * 0.6) - a.reload * 0.03 + drift,
        lerp(HIP.y, ADS.y, p) + a.swayY.x * (1 - p * 0.6) - a.reload * 0.035 - lower * 0.32 + breathe - a.bump * 0.006,
        lerp(HIP.z, ADS.z, p) + a.kickZ.x * 0.05 + a.reload * 0.04,
      );
      gun.root.rotation.set(lerp(HIP.rx, ADS.rx, p) + a.kickR.x * 0.06 + a.reload * 0.2 - lower * 0.8 + a.bump * 0.02, lerp(HIP.ry, ADS.ry, p) + a.swayX.x * 1.5, -a.reload * 0.55 + a.swayX.x * 2.5);

      let slide = 0;
      if (engine.weapon === "pumping") {
        const t = engine.weaponT / Math.max(engine.weaponLen, 1e-3);
        slide = t < 0.08 ? 0 : Math.sin(Math.PI * Math.min(1, (t - 0.08) / 0.62));
      }
      gun.pump.position.z = -0.3 + slide * 0.085;

      const r = a.reload;
      gun.leftHand.position.set(lerp(0, 0.01, r), lerp(0, -0.04, r) - a.bump * 0.02, lerp(0, 0.26, r));
      gun.leftHand.rotation.set(lerp(0, 0.3, r), 0, lerp(0, -0.2, r));
      gun.heldShell.visible = r > 0.5;

      const flashOn = a.flashT < 0.055 && !hidden;
      this.flash.visible = flashOn;
      this.light.intensity = flashOn ? 3 : 0;
      if (flashOn) {
        gun.muzzle.getWorldPosition(this.flash.position);
        this.light.position.copy(this.flash.position);
        this.flash.scale.setScalar(0.22 + Math.random() * 0.1);
      }
    } else {
      this.flash.visible = false;
      this.light.intensity = 0;
      const zoomT = engine.zoomIndex / (CAMERA_ZOOMS.length - 1);
      a.lens = lerp(a.lens, 1 + zoomT * 1.4, Math.min(1, dt * 10));
      camRig.lens.scale.z = a.lens;
      // Zoomed in = looking through the viewfinder, so the camera body drops out of the way.
      const away = zoomT * 0.16;
      camRig.root.position.set(CAM_POSE.x + a.swayX.x + away * 0.4, CAM_POSE.y + a.swayY.x - lower * 0.32 - away + breathe, CAM_POSE.z + a.camPush * 0.012);
      camRig.root.rotation.set(0.12 - lower * 0.8 + a.camPush * 0.03, CAM_POSE.ry + a.swayX.x * 1.4, a.swayX.x * 2);
      camRig.flash.emissiveIntensity = a.camPush > 0.7 ? 3 : 0;
    }

    for (const s of this.shells) {
      if (s.t < 0) continue;
      s.t += dt;
      s.v.y -= 6 * dt;
      s.g.position.addScaledVector(s.v, dt);
      s.g.rotation.x += s.w.x * dt;
      s.g.rotation.y += s.w.y * dt;
      s.g.rotation.z += s.w.z * dt;
      if (s.t > 0.8) {
        s.t = -1;
        s.g.visible = false;
      }
    }
    for (const s of this.smoke) {
      if (s.t < 0) continue;
      s.t += dt;
      const k = s.t / 0.9;
      if (k >= 1) {
        s.t = -1;
        s.s.visible = false;
        continue;
      }
      s.s.visible = true;
      s.s.position.addScaledVector(s.v, dt);
      s.s.scale.setScalar(0.05 + k * 0.22);
      s.mat.opacity = 0.35 * (1 - k);
    }

    // Light the hands and gun from wherever the sun is relative to the view.
    _q.copy(mainCamera.quaternion).invert();
    this.sun.position.copy(SUN_VECTOR).applyQuaternion(_q).multiplyScalar(5);
  }

  dispose(): void {
    disposeTree(this.gun.root);
    for (const s of this.shells) disposeTree(s.g);
    disposeTree(this.cam.root);
    for (const mat of Object.values(this.m) as Material[]) mat.dispose();
    for (const mat of this.cam.materials) mat.dispose();
    this.flashMat.dispose();
    for (const s of this.smoke) s.mat.dispose();
    for (const t of this.textures) t.dispose();
  }
}
