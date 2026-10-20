import { Mesh, MeshStandardMaterial, PlaneGeometry, type BufferAttribute } from "three";
import { COLS } from "../config";
import { SIDE_EXTRA, worldZ } from "./meshes/board";

export const WATER_Y = -0.08;

/**
 * The river surface: a faceted plane whose vertices bob on a couple of sine
 * waves, giving the chunky, sparkly low-poly water from the screenshots.
 */
export class Water {
  readonly mesh: Mesh;
  private readonly base: Float32Array;
  private readonly geo: PlaneGeometry;
  private readonly material: MeshStandardMaterial;

  constructor() {
    const width = COLS + SIDE_EXTRA * 2;
    this.geo = new PlaneGeometry(width, 5, 56, 12).rotateX(-Math.PI / 2);
    this.base = Float32Array.from(this.geo.getAttribute("position").array);
    this.material = new MeshStandardMaterial({
      color: "#2E9BFF",
      emissive: "#0B4FB3",
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.05,
      flatShading: true,
    });
    this.mesh = new Mesh(this.geo, this.material);
    this.mesh.position.set(0, WATER_Y, worldZ(3));
    this.mesh.receiveShadow = true;
  }

  update(time: number, calm: boolean): void {
    const pos = this.geo.getAttribute("position") as BufferAttribute;
    const arr = pos.array as Float32Array;
    const amp = calm ? 0.02 : 0.05;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.base[i];
      const z = this.base[i + 2];
      arr[i + 1] = Math.sin(x * 1.3 + time * 1.7) * amp + Math.cos(z * 2.3 - time * 1.2) * amp * 0.7;
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
