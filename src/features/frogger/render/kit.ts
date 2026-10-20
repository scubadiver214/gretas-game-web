import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { barkTexture, grassTexture, logEndTexture, shellTexture, truckLogoTexture } from "./textures";

/**
 * Shared geometries, materials and textures for one renderer. Meshes reuse
 * these, so building a level never allocates new GPU resources, and
 * `dispose()` frees everything when the game unmounts.
 */
export class Kit {
  private materials = new Map<string, Material>();
  private geometries = new Map<string, BufferGeometry>();
  readonly textures: { bark: Texture; logEnd: Texture; shell: Texture; truckLogo: Texture; grass: Texture };

  constructor() {
    this.textures = {
      bark: barkTexture(),
      logEnd: logEndTexture(),
      shell: shellTexture(),
      truckLogo: truckLogoTexture(),
      grass: grassTexture(),
    };
  }

  /** Flat-shaded low-poly material, cached by colour + options. */
  mat(color: string, opts: { rough?: number; metal?: number; emissive?: string; map?: Texture; flat?: boolean } = {}): MeshStandardMaterial {
    const key = `std|${color}|${opts.rough ?? 0.7}|${opts.metal ?? 0}|${opts.emissive ?? ""}|${opts.map?.uuid ?? ""}|${opts.flat ?? true}`;
    let m = this.materials.get(key) as MeshStandardMaterial | undefined;
    if (!m) {
      m = new MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.7,
        metalness: opts.metal ?? 0,
        flatShading: opts.flat ?? true,
        map: opts.map ?? null,
        emissive: opts.emissive ?? "#000000",
        emissiveIntensity: opts.emissive ? 0.6 : 0,
      });
      this.materials.set(key, m);
    }
    return m;
  }

  /** Register a material the kit should dispose (e.g. per-object clones). */
  track<M extends Material>(m: M): M {
    this.materials.set(`tracked|${m.uuid}`, m);
    return m;
  }

  box(w: number, h: number, d: number): BoxGeometry {
    return this.geo(`box|${w}|${h}|${d}`, () => new BoxGeometry(w, h, d)) as BoxGeometry;
  }

  sphere(r: number, w = 8, h = 6, thetaLength = Math.PI): SphereGeometry {
    return this.geo(`sph|${r}|${w}|${h}|${thetaLength}`, () => new SphereGeometry(r, w, h, 0, Math.PI * 2, 0, thetaLength)) as SphereGeometry;
  }

  cylinder(rTop: number, rBottom: number, h: number, seg = 8): CylinderGeometry {
    return this.geo(`cyl|${rTop}|${rBottom}|${h}|${seg}`, () => new CylinderGeometry(rTop, rBottom, h, seg)) as CylinderGeometry;
  }

  geo(key: string, make: () => BufferGeometry): BufferGeometry {
    let g = this.geometries.get(key);
    if (!g) {
      g = make();
      this.geometries.set(key, g);
    }
    return g;
  }

  dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    for (const g of this.geometries.values()) g.dispose();
    for (const t of Object.values(this.textures)) t.dispose();
    this.materials.clear();
    this.geometries.clear();
  }
}
