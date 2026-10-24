import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";

export interface MatOptions {
  rough?: number;
  metal?: number;
  emissive?: string;
  emissiveIntensity?: number;
  map?: Texture;
  flat?: boolean;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Shared geometries and materials for one renderer. Meshes reuse these, so
 * building a level never allocates new GPU resources, and `dispose()` frees
 * everything when the game unmounts. Games with procedural textures extend
 * this with their own texture set (see features/frogger/render/kit.ts).
 */
export class MeshKit {
  protected materials = new Map<string, Material>();
  protected geometries = new Map<string, BufferGeometry>();
  protected ownedTextures: Texture[] = [];

  /** Flat-shaded low-poly material, cached by colour + options. */
  mat(color: string, opts: MatOptions = {}): MeshStandardMaterial {
    const key = `std|${color}|${opts.rough ?? 0.7}|${opts.metal ?? 0}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? ""}|${opts.map?.uuid ?? ""}|${opts.flat ?? true}|${opts.transparent ?? false}|${opts.opacity ?? 1}`;
    let m = this.materials.get(key) as MeshStandardMaterial | undefined;
    if (!m) {
      m = new MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.7,
        metalness: opts.metal ?? 0,
        flatShading: opts.flat ?? true,
        map: opts.map ?? null,
        emissive: opts.emissive ?? "#000000",
        emissiveIntensity: opts.emissive ? (opts.emissiveIntensity ?? 0.6) : 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
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

  /** Register a texture the kit should dispose. */
  texture<T extends Texture>(t: T): T {
    this.ownedTextures.push(t);
    return t;
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

  cone(r: number, h: number, seg = 8): ConeGeometry {
    return this.geo(`cone|${r}|${h}|${seg}`, () => new ConeGeometry(r, h, seg)) as ConeGeometry;
  }

  torus(r: number, tube: number, radial = 6, tubular = 12, arc = Math.PI * 2): TorusGeometry {
    return this.geo(`tor|${r}|${tube}|${radial}|${tubular}|${arc}`, () => new TorusGeometry(r, tube, radial, tubular, arc)) as TorusGeometry;
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
    for (const t of this.ownedTextures) t.dispose();
    this.materials.clear();
    this.geometries.clear();
    this.ownedTextures = [];
  }
}
