import { Group, Mesh, MeshStandardMaterial, type Object3D } from "three";
import type { Kit } from "../kit";

export interface TurtleGroupRig {
  root: Group;
  /** Flipper pivots, animated as the turtles paddle. */
  flippers: Object3D[];
  /** Per-group shell material so a diving group can blush red as a warning. */
  shell: MeshStandardMaterial;
}

/** `count` turtles in a row along X, facing +X (the caller flips left-bound lanes). */
export function buildTurtleGroup(kit: Kit, count: number): TurtleGroupRig {
  const root = new Group();
  const shell = kit.track(new MeshStandardMaterial({ color: "#FFFFFF", map: kit.textures.shell, roughness: 0.6, flatShading: true }));
  const skin = kit.mat("#7BC96F");
  const under = kit.mat("#E9D8A6");
  const shellGeo = kit.sphere(0.38, 9, 4, Math.PI / 2);
  const flippers: Object3D[] = [];

  for (let i = 0; i < count; i++) {
    const t = new Group();
    t.position.x = i - (count - 1) / 2;
    const top = new Mesh(shellGeo, shell);
    top.scale.set(1, 0.6, 1.05);
    top.position.y = 0.08;
    top.castShadow = true;
    t.add(top);
    const belly = new Mesh(kit.cylinder(0.37, 0.34, 0.08, 9), under);
    belly.position.y = 0.06;
    t.add(belly);
    const head = new Mesh(kit.sphere(0.12, 7, 5), skin);
    head.position.set(0.43, 0.12, 0);
    head.castShadow = true;
    t.add(head);
    for (const eyeZ of [-0.06, 0.06]) {
      const eye = new Mesh(kit.sphere(0.025, 5, 4), kit.mat("#14161C"));
      eye.position.set(0.52, 0.17, eyeZ);
      t.add(eye);
    }
    for (const [fx, fz] of [
      [0.24, -0.33],
      [0.24, 0.33],
      [-0.24, -0.3],
      [-0.24, 0.3],
    ] as const) {
      const pivot = new Group();
      pivot.position.set(fx, 0.06, fz);
      const flipper = new Mesh(kit.box(0.2, 0.04, 0.12), skin);
      flipper.position.z = fz > 0 ? 0.05 : -0.05;
      pivot.add(flipper);
      t.add(pivot);
      flippers.push(pivot);
    }
    root.add(t);
  }
  return { root, flippers, shell };
}
