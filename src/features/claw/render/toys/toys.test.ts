import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { MeshKit } from "@/components/three/kit";
import { PRIZES } from "../../content/prizes";
import { TOY_BUILDERS, buildToy, floorSitOffset } from "./index";

// Slime jars draw a canvas label, which needs a DOM; everything else is pure geometry.
const NEEDS_DOM = new Set(["slime"]);

describe("toy builders", () => {
  it("has a builder for every model a prize uses", () => {
    for (const p of PRIZES) expect(TOY_BUILDERS[p.model], p.id).toBeDefined();
  });

  it("builds every prize at roughly its catalog size, centred on its origin", () => {
    const kit = new MeshKit();
    const size = new Vector3();
    const centre = new Vector3();
    for (const p of PRIZES.filter((x) => !NEEDS_DOM.has(x.model))) {
      const g = buildToy(kit, p);
      g.updateMatrixWorld(true);
      const box = new Box3().setFromObject(g);
      box.getSize(size);
      box.getCenter(centre);
      const extent = Math.max(size.x, size.y, size.z);
      // Models are authored in a unit sphere: allow a little overhang (ears, horns) but nothing wild.
      expect(extent, p.id).toBeGreaterThan(p.size * 0.9);
      expect(extent, p.id).toBeLessThan(p.size * 2.6);
      expect(centre.length(), p.id).toBeLessThan(p.size * 0.6);
    }
    kit.dispose();
  });

  it("sits a mesh on the floor of its physics sphere", () => {
    expect(floorSitOffset(-0.4, 0.4)).toBeCloseTo(0);
    expect(floorSitOffset(-0.2, 0.4)).toBeCloseTo(-0.2);
  });
});
