import { BoxGeometry, CircleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import type { MeshKit } from "@/components/three/kit";
import { WEAPONS } from "../../config";
import type { RaceEngine } from "../../engine/RaceEngine";
import type { WeaponKind } from "../../types";
import type { WeaponCrate } from "../../world/content";

const TINT: Record<WeaponKind, string> = { gun: "#ffb020", mine: "#ff4d4d", oil: "#3d7dff" };

/**
 * Weapon icons on the road, plus the bolts, mines and oil puddles the player has
 * laid down. The icons bob until they are picked up and come back on the next lap.
 */
export class WeaponProps {
  readonly group = new Group();
  private readonly crates: Mesh[] = [];
  private readonly baseY: number[] = [];
  private readonly hidden: Uint8Array;
  private readonly bolts: Mesh[] = [];
  private readonly mines: Mesh[] = [];
  private readonly slicks: Mesh[] = [];

  constructor(
    private readonly items: readonly WeaponCrate[],
    kit: MeshKit,
  ) {
    this.hidden = new Uint8Array(items.length);
    const geo: Record<WeaponKind, BoxGeometry | SphereGeometry> = {
      gun: kit.geo("weapon-gun", () => new BoxGeometry(1.15, 0.45, 0.7)) as BoxGeometry,
      mine: kit.geo("weapon-mine", () => new SphereGeometry(0.55, 12, 10)) as SphereGeometry,
      oil: kit.geo("weapon-oil-icon", () => new SphereGeometry(0.5, 12, 10)) as SphereGeometry,
    };
    const mat: Record<WeaponKind, MeshStandardMaterial> = {
      gun: kit.mat(TINT.gun, { emissive: "#ff8a00", emissiveIntensity: 0.7, rough: 0.35 }),
      mine: kit.mat(TINT.mine, { emissive: "#ff2020", emissiveIntensity: 0.55, rough: 0.4 }),
      oil: kit.mat(TINT.oil, { emissive: "#1a4dff", emissiveIntensity: 0.45, rough: 0.25 }),
    };
    for (const c of items) {
      const mesh = new Mesh(geo[c.kind], mat[c.kind]);
      mesh.position.set(c.x, c.y, c.z);
      mesh.castShadow = false;
      this.group.add(mesh);
      this.crates.push(mesh);
      this.baseY.push(c.y);
    }

    const boltMat = kit.mat("#ffe27a", { emissive: "#ffb020", emissiveIntensity: 1.1, rough: 0.2 });
    const boltGeo = kit.geo("weapon-bolt", () => new SphereGeometry(0.28, 8, 6)) as SphereGeometry;
    for (let i = 0; i < 8; i++) {
      const mesh = new Mesh(boltGeo, boltMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.bolts.push(mesh);
    }
    const mineMat = kit.mat("#ff5a5a", { emissive: "#ff2020", emissiveIntensity: 0.4, rough: 0.45 });
    const mineGeo = kit.geo("weapon-mine-live", () => new SphereGeometry(0.42, 10, 8)) as SphereGeometry;
    for (let i = 0; i < 8; i++) {
      const mesh = new Mesh(mineGeo, mineMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.mines.push(mesh);
    }
    const slickMat = kit.track(new MeshStandardMaterial({ color: "#1a2744", roughness: 0.15, metalness: 0.55, transparent: true, opacity: 0.82 }));
    const slickGeo = kit.geo("weapon-slick", () => new CircleGeometry(WEAPONS.oilRadius, 20).rotateX(-Math.PI / 2));
    for (let i = 0; i < 8; i++) {
      const mesh = new Mesh(slickGeo, slickMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.slicks.push(mesh);
    }
  }

  collect(id: number): void {
    if (id < 0 || id >= this.crates.length) return;
    this.hidden[id] = 1;
    this.crates[id].visible = false;
  }

  reset(): void {
    this.hidden.fill(0);
    for (const mesh of this.crates) mesh.visible = true;
  }

  update(time: number, engine: RaceEngine): void {
    for (let i = 0; i < this.crates.length; i++) {
      if (this.hidden[i]) continue;
      const mesh = this.crates[i];
      mesh.position.y = this.baseY[i] + Math.sin(time * 2.4 + i) * 0.18;
      mesh.rotation.y = time * 1.6 + i;
    }
    this.place(this.bolts, engine.shots);
    this.place(this.mines, engine.mines);
    this.place(this.slicks, engine.slicks);
  }

  private place(meshes: Mesh[], items: readonly { x: number; y: number; z: number }[]): void {
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const item = items[i];
      if (!item) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(item.x, item.y, item.z);
    }
  }
}
