import { Color, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import type { MeshKit } from "@/components/three/kit";
import { CABINET, CHUTE, GAME_TITLE } from "../../config";
import type { WorldPalette } from "../../content/worlds";
import { backdropTexture, floorTexture, marqueeTexture, stickerTexture } from "../textures";

export interface CabinetRig {
  root: Group;
  /** Marquee bulbs, chased by the renderer. */
  bulbs: InstancedMesh;
  bulbCount: number;
  /** Lit rim around the chute, pulsed when a prize drops. */
  chuteRim: Mesh;
  /** Gantry bar that slides along x with the claw. */
  gantry: Group;
  /** Carriage on the gantry that slides along z. */
  carriage: Mesh;
  /** The big red button on the control panel (pressed when the player grabs). */
  button: Mesh;
  /** Joystick stick, tilted on X (forward/back) and Z (left/right) while the claw moves. */
  stick: Group;
}

const W = CABINET.width;
const D = CABINET.depth;
const H = CABINET.height;
/** Height of the plinth under the floor (the prize bin lives inside it). */
export const PLINTH_H = 1.5;
export const MARQUEE_H = 0.85;
const POST = 0.22;
const GLASS_T = 0.04;

function shade(hex: string, amount: number): string {
  const c = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

function box(kit: MeshKit, w: number, h: number, d: number, color: string, x: number, y: number, z: number, opts: Parameters<MeshKit["mat"]>[1] = {}, shadow = true): Mesh {
  const m = new Mesh(kit.box(w, h, d), kit.mat(color, { flat: false, ...opts }));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/**
 * The claw cabinet: plinth with the prize door, chequered floor with the
 * chute hole, polka-dot back wall, glass sides, trim posts, a lit marquee
 * with chasing bulbs, the gantry rails and a decorative control panel.
 */
/** `titleFont` is the CSS font family for the marquee lettering (the game's cursive face once loaded). */
export function buildCabinet(kit: MeshKit, palette: WorldPalette, titleFont = "cursive"): CabinetRig {
  const root = new Group();
  const body = palette.cabinet;
  const trim = palette.trim;
  const bodyDark = shade(body, -0.12);

  // Plinth under the floor, slightly wider than the glass.
  root.add(box(kit, W + 0.7, PLINTH_H, D + 0.7, body, 0, -PLINTH_H / 2, 0));
  root.add(box(kit, W + 0.8, 0.14, D + 0.8, trim, 0, -0.07, 0));
  root.add(box(kit, W + 0.8, 0.14, D + 0.8, trim, 0, -PLINTH_H + 0.07, 0));
  // Prize door on the front-left of the plinth, under the chute.
  root.add(box(kit, CHUTE.size + 0.3, 0.8, 0.08, bodyDark, CHUTE.x, -0.7, D / 2 + 0.36));
  root.add(box(kit, CHUTE.size + 0.1, 0.62, 0.06, "#0B0F17", CHUTE.x, -0.7, D / 2 + 0.4, {}, false));
  const doorRim = box(kit, CHUTE.size + 0.3, 0.8, 0.02, trim, CHUTE.x, -0.7, D / 2 + 0.41, { emissive: palette.glow, emissiveIntensity: 0.3 }, false);
  root.add(doorRim);

  // Floor in four strips, leaving the chute square open.
  const floorMat = kit.mat("#FFFFFF", { map: kit.texture(floorTexture(palette.floor, shade(palette.floor, 0.1))), flat: false, rough: 0.8 });
  const half = CHUTE.size / 2;
  const strips: [number, number, number, number][] = [
    // [x, z, w, d]
    [(CHUTE.x + half + W / 2) / 2, 0, W / 2 - (CHUTE.x + half), D],
    [CHUTE.x, (CHUTE.z - half - D / 2) / 2, CHUTE.size, CHUTE.z - half + D / 2],
    [(-W / 2 + CHUTE.x - half) / 2, 0, CHUTE.x - half + W / 2, D],
    [CHUTE.x, (CHUTE.z + half + D / 2) / 2, CHUTE.size, D / 2 - (CHUTE.z + half)],
  ];
  for (const [x, z, w, d] of strips) {
    if (w <= 0.001 || d <= 0.001) continue;
    const m = new Mesh(kit.box(w, 0.1, d), floorMat);
    m.position.set(x, -0.05, z);
    m.receiveShadow = true;
    root.add(m);
  }
  // Chute: dark walls down into the plinth and a glowing rim.
  const binDepth = CHUTE.depth + 0.4;
  const wallMat = kit.mat("#141A26", { flat: false, rough: 0.9 });
  for (const [dx, dz, w, d] of [
    [0, -half, CHUTE.size, 0.04],
    [0, half, CHUTE.size, 0.04],
    [-half, 0, 0.04, CHUTE.size],
    [half, 0, 0.04, CHUTE.size],
  ]) {
    const wall = new Mesh(kit.box(w, binDepth, d), wallMat);
    wall.position.set(CHUTE.x + dx, -binDepth / 2, CHUTE.z + dz);
    root.add(wall);
  }
  const binFloor = new Mesh(kit.box(CHUTE.size, 0.04, CHUTE.size), kit.mat("#1B2333", { flat: false }));
  binFloor.position.set(CHUTE.x, -binDepth, CHUTE.z);
  root.add(binFloor);
  // Lit frame around the hole (four bars sharing one material so the renderer can pulse it).
  const rimMat = kit.track(new MeshStandardMaterial({ color: trim, emissive: new Color(palette.glow), emissiveIntensity: 0.5, roughness: 0.4 }));
  const rimOuter = CHUTE.size + 0.2;
  const rimBar = 0.1;
  const chuteRim = new Mesh(kit.box(rimOuter, 0.06, rimBar), rimMat);
  chuteRim.position.set(CHUTE.x, 0.03, CHUTE.z - half - rimBar / 2);
  root.add(chuteRim);
  const rimBack = new Mesh(kit.box(rimOuter, 0.06, rimBar), rimMat);
  rimBack.position.set(CHUTE.x, 0.03, CHUTE.z + half + rimBar / 2);
  root.add(rimBack);
  for (const side of [-1, 1]) {
    const bar = new Mesh(kit.box(rimBar, 0.06, rimOuter), rimMat);
    bar.position.set(CHUTE.x + side * (half + rimBar / 2), 0.03, CHUTE.z);
    root.add(bar);
  }
  // Dark floor of the bin, visible through the hole.
  const hole = new Mesh(kit.box(CHUTE.size, 0.02, CHUTE.size), kit.mat("#05070F", { flat: false }));
  hole.position.set(CHUTE.x, -binDepth + 0.03, CHUTE.z);
  root.add(hole);

  // Back wall and side walls (the sides are glass, the back is decorated).
  const back = new Mesh(kit.box(W, H, 0.1), kit.mat("#FFFFFF", { map: kit.texture(backdropTexture(palette.backdrop, palette.glow)), flat: false, rough: 0.9 }));
  back.position.set(0, H / 2, -D / 2 - 0.05);
  back.receiveShadow = true;
  root.add(back);

  // Glass: side panes and the front pane, drawn last.
  const glassMat = kit.track(new MeshStandardMaterial({ color: "#BFE7FF", transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.1, depthWrite: false, side: DoubleSide }));
  for (const side of [-1, 1]) {
    const pane = new Mesh(kit.box(GLASS_T, H, D), glassMat);
    pane.position.set(side * (W / 2 + GLASS_T / 2), H / 2, 0);
    pane.renderOrder = 10;
    root.add(pane);
  }
  const front = new Mesh(kit.box(W, H, GLASS_T), glassMat);
  front.position.set(0, H / 2, D / 2 + GLASS_T / 2);
  front.renderOrder = 11;
  root.add(front);
  // Glass highlight stripe (a diagonal gloss) so the pane reads as glass.
  const gloss = new Mesh(kit.box(0.35, H * 0.9, 0.01), kit.track(new MeshStandardMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.08, depthWrite: false })));
  gloss.position.set(-W / 2 + 0.8, H / 2, D / 2 + GLASS_T + 0.005);
  gloss.rotation.z = 0.12;
  gloss.renderOrder = 12;
  root.add(gloss);

  // Trim posts and top frame.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      root.add(box(kit, POST, H + 0.2, POST, trim, sx * (W / 2 + POST / 2), H / 2 + 0.1, sz * (D / 2 + POST / 2), { rough: 0.4 }));
    }
    root.add(box(kit, POST, POST, D + POST * 2, trim, sx * (W / 2 + POST / 2), H + 0.1, 0, { rough: 0.4 }));
  }
  root.add(box(kit, W + POST * 2, POST, POST, trim, 0, H + 0.1, D / 2 + POST / 2, { rough: 0.4 }));
  root.add(box(kit, W + POST * 2, POST, POST, trim, 0, H + 0.1, -D / 2 - POST / 2, { rough: 0.4 }));

  // Marquee on top: body box, lit sign on the front, bulbs around the sign.
  const mq = new Group();
  mq.position.set(0, H + 0.2 + MARQUEE_H / 2, 0);
  mq.add(box(kit, W + 0.7, MARQUEE_H, D + 0.7, body, 0, 0, 0));
  const signW = W + 0.1;
  const signH = MARQUEE_H - 0.3;
  const marquee = kit.texture(marqueeTexture(GAME_TITLE, shade(body, -0.25), "#FFFFFF", trim, titleFont, signW / signH));
  const sign = new Mesh(kit.box(signW, signH, 0.06), kit.track(new MeshStandardMaterial({ map: marquee, emissive: new Color("#FFFFFF"), emissiveMap: null, emissiveIntensity: 0.25, roughness: 0.6 })));
  sign.position.set(0, 0, D / 2 + 0.38);
  mq.add(sign);
  root.add(mq);

  const bulbPositions: Vector3[] = [];
  const perRow = 12;
  for (let i = 0; i < perRow; i++) {
    const x = -W / 2 - 0.2 + ((W + 0.4) * i) / (perRow - 1);
    bulbPositions.push(new Vector3(x, H + 0.2 + MARQUEE_H - 0.1, D / 2 + 0.4));
    bulbPositions.push(new Vector3(x, H + 0.3, D / 2 + 0.4));
  }
  for (let i = 0; i < 5; i++) {
    const y = H + 0.35 + (MARQUEE_H - 0.3) * (i / 4);
    bulbPositions.push(new Vector3(-W / 2 - 0.3, y, D / 2 + 0.4), new Vector3(W / 2 + 0.3, y, D / 2 + 0.4));
  }
  const bulbMat = kit.track(new MeshStandardMaterial({ color: "#FFF4B8", emissive: new Color(palette.glow), emissiveIntensity: 1, roughness: 0.3 }));
  const bulbs = new InstancedMesh(kit.sphere(0.075, 8, 6), bulbMat, bulbPositions.length);
  const m = new Matrix4();
  bulbPositions.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    bulbs.setMatrixAt(i, m);
    bulbs.setColorAt(i, new Color("#FFFFFF"));
  });
  bulbs.instanceMatrix.needsUpdate = true;
  root.add(bulbs);

  // Side sticker.
  const sticker = new Mesh(kit.box(0.02, 1.4, 1.4), kit.mat("#FFFFFF", { map: kit.texture(stickerTexture(palette.glow)), flat: false, transparent: true }));
  sticker.position.set(W / 2 + 0.4, -PLINTH_H / 2, 0);
  sticker.castShadow = false;
  root.add(sticker);

  // Gantry: two rails along x at the top, a bar along z that follows the claw, and a carriage on it.
  // Rails run to the inner glass so the carriage can travel every floor tile.
  const railMat = { rough: 0.35, metal: 0.6, flat: false } as const;
  for (const sz of [-1, 1]) root.add(box(kit, W, 0.08, 0.08, "#C9D2E3", 0, H + 0.02, sz * (D / 2), railMat, false));
  const gantry = new Group();
  gantry.position.set(0, H + 0.02, 0);
  gantry.add(box(kit, 0.1, 0.1, D, "#E6EBF5", 0, 0.05, 0, railMat, false));
  const carriage = box(kit, 0.42, 0.26, 0.42, trim, 0, 0.02, 0, { rough: 0.4 }, false);
  gantry.add(carriage);
  root.add(gantry);

  // Control panel: a sloped shelf on the front with a joystick and the big GRAB button.
  const panel = new Group();
  panel.position.set(0.3, -0.25, D / 2 + 0.75);
  const shelf = box(kit, W * 0.62, 0.22, 0.95, bodyDark, 0, 0, 0, { rough: 0.6 });
  shelf.rotation.x = 0.22;
  panel.add(shelf);
  const stick = new Group();
  stick.name = "joystick";
  // Sit on the sloped shelf so forward/back lean reads on-screen, not into the camera.
  stick.position.set(-0.9, 0.14, 0);
  stick.add(box(kit, 0.1, 0.5, 0.1, "#2B2D42", 0, 0.25, 0, { rough: 0.4, metal: 0.4 }, false));
  const knob = new Mesh(kit.sphere(0.2, 12, 9), kit.mat("#E63946", { flat: false, rough: 0.35 }));
  knob.position.y = 0.55;
  stick.add(knob);
  shelf.add(stick);
  shelf.add(box(kit, 0.42, 0.06, 0.42, "#2B2D42", -0.9, 0.14, 0, { rough: 0.5 }, false));
  const buttonBase = new Mesh(kit.cylinder(0.36, 0.4, 0.1, 18), kit.mat("#2B2D42", { flat: false, rough: 0.5 }));
  buttonBase.position.set(0.9, 0.16, 0);
  panel.add(buttonBase);
  const button = new Mesh(kit.cylinder(0.3, 0.3, 0.18, 18), kit.track(new MeshStandardMaterial({ color: "#E63946", emissive: new Color("#E63946"), emissiveIntensity: 0.35, roughness: 0.35 })));
  button.position.set(0.9, 0.3, 0);
  panel.add(button);
  root.add(panel);

  return { root, bulbs, bulbCount: bulbPositions.length, chuteRim, gantry, carriage, button, stick };
}
