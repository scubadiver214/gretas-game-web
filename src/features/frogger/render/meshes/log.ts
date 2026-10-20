import { CylinderGeometry, Group, Mesh } from "three";
import type { Kit } from "../kit";

export const LOG_RADIUS = 0.36;
/** Logs float half-submerged; this is their centre height. */
export const LOG_Y = 0.04;

/**
 * A floating log lying along X. Bark streak density stays constant whatever
 * the length because the side UVs are stretched with it.
 */
export function buildLog(kit: Kit, length: number): Group {
  const len = Math.max(0.5, length - 0.08);
  const radial = 9;
  const geo = kit.geo(`log|${len}`, () => {
    const g = new CylinderGeometry(LOG_RADIUS, LOG_RADIUS, len, radial, 1);
    const uv = g.getAttribute("uv");
    const sideVerts = (radial + 1) * 2;
    for (let i = 0; i < sideVerts; i++) uv.setY(i, uv.getY(i) * (len / 1.6));
    uv.needsUpdate = true;
    g.rotateZ(Math.PI / 2);
    return g;
  });
  const side = kit.mat("#FFFFFF", { map: kit.textures.bark, rough: 0.85 });
  const end = kit.mat("#FFFFFF", { map: kit.textures.logEnd, rough: 0.8 });
  const g = new Group();
  const log = new Mesh(geo, [side, end, end]);
  log.position.y = LOG_Y;
  log.castShadow = true;
  log.receiveShadow = true;
  g.add(log);

  // A stubby branch on longer logs for silhouette variety.
  if (len > 3) {
    const branch = new Mesh(kit.cylinder(0.07, 0.09, 0.32, 6), kit.mat("#7A4B22"));
    branch.position.set(len * 0.2, LOG_Y + LOG_RADIUS + 0.08, 0.1);
    branch.rotation.z = -0.6;
    branch.castShadow = true;
    g.add(branch);
  }
  return g;
}
