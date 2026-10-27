import { Color, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, type BufferGeometry } from "three";
import { mergeColored, paint, place, solid } from "../geo";

const C = (hex: string) => new Color(hex);

export interface CritterRig {
  root: Group;
  body: Group;
  /** Head (turtle) or throat (frog) for idle animation. */
  head: Group;
  legs: Group;
}

export interface CritterKit {
  turtle: () => CritterRig;
  frog: () => CritterRig;
  dispose: () => void;
}

export function createCritterKit(): CritterKit {
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
  const geos: BufferGeometry[] = [];
  const keep = <T extends BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };

  // Painted turtle: dark domed shell with red and yellow rim markings, striped head.
  const shell = new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  shell.scale(0.17, 0.075, 0.21);
  const turtleShell = keep(
    mergeColored([
      paint(shell, (p, _n, out) => {
        const rim = Math.hypot(p.x / 0.17, p.z / 0.21);
        out.copy(C("#2f3a26"));
        if (rim > 0.9) out.copy(Math.sin(Math.atan2(p.z, p.x) * 22) > 0 ? C("#c2412b") : C("#e0b83a"));
        else if (Math.abs(Math.sin(p.x * 40)) < 0.12 || Math.abs(Math.sin(p.z * 32)) < 0.1) out.copy(C("#8b8f4a"));
      }),
      solid(place(new SphereGeometry(1, 14, 6), [0, -0.005, 0], [0, 0, 0], [0.16, 0.02, 0.2]), "#d9b44a"),
    ]),
  );
  const turtleHead = keep(
    mergeColored([
      paint(place(new SphereGeometry(0.045, 12, 8), [0, 0.02, 0.05], [0, 0, 0], [0.85, 0.75, 1.3]), (p, _n, out) => out.copy(Math.abs(Math.sin(p.y * 160 + p.x * 40)) < 0.25 ? C("#e8c94a") : C("#2c3a24"))),
      solid(place(new SphereGeometry(0.008, 6, 4), [0.026, 0.035, 0.09]), "#0d0d0d"),
      solid(place(new SphereGeometry(0.008, 6, 4), [-0.026, 0.035, 0.09]), "#0d0d0d"),
    ]),
  );
  const turtleLegs = keep(
    mergeColored(
      [
        [0.13, 0.12],
        [-0.13, 0.12],
        [0.12, -0.14],
        [-0.12, -0.14],
      ].map(([x, z]) => solid(place(new SphereGeometry(0.04, 8, 6), [x, 0.0, z], [0, 0, 0], [1.3, 0.45, 0.9]), "#2c3a24")),
    ),
  );

  // Green frog: plump body, bulging eyes, folded hind legs, pale throat.
  const frogBody = keep(
    mergeColored([
      paint(place(new SphereGeometry(1, 18, 12), [0, 0.04, 0], [0, 0, 0], [0.055, 0.04, 0.075]), (p, n, out) => {
        out.copy(n.y < -0.2 ? C("#e8e2b8") : C("#4f8f2a"));
        if (n.y > 0.2 && Math.sin(p.x * 160) * Math.sin(p.z * 140) > 0.6) out.copy(C("#2c5a1a"));
      }),
      ...[1, -1].flatMap((s) => [
        solid(place(new SphereGeometry(0.018, 10, 8), [0.028 * s, 0.075, 0.045]), "#5c9a33"),
        solid(place(new SphereGeometry(0.011, 8, 6), [0.034 * s, 0.081, 0.054]), "#c9a226"),
        solid(place(new SphereGeometry(0.006, 6, 4), [0.037 * s, 0.083, 0.06]), "#0b0b0b"),
        solid(place(new SphereGeometry(1, 10, 6), [0.05 * s, 0.02, -0.03], [0, 0.4 * s, 0], [0.022, 0.016, 0.06]), "#4a8a28"),
        solid(place(new SphereGeometry(1, 8, 6), [0.06 * s, 0.008, 0.005], [0, -0.3 * s, 0], [0.03, 0.008, 0.018]), "#4a8a28"),
        solid(place(new ConeGeometry(0.01, 0.045, 5), [0.035 * s, 0.01, 0.06], [0.6, 0, 0.3 * s]), "#4a8a28"),
      ]),
    ]),
  );
  const frogThroat = keep(solid(place(new SphereGeometry(0.03, 10, 8), [0, 0.022, 0.058], [0, 0, 0], [1, 0.7, 0.8]), "#efe9c4"));

  function rig(bodyGeo: BufferGeometry, headGeo: BufferGeometry, legGeo: BufferGeometry | null, scale: number): CritterRig {
    const root = new Group();
    const body = new Group();
    body.scale.setScalar(scale);
    root.add(body);
    body.add(new Mesh(bodyGeo, mat));
    const head = new Group();
    head.add(new Mesh(headGeo, mat));
    body.add(head);
    const legs = new Group();
    if (legGeo) legs.add(new Mesh(legGeo, mat));
    body.add(legs);
    return { root, body, head, legs };
  }

  return {
    turtle: () => {
      const r = rig(turtleShell, turtleHead, turtleLegs, 1.25);
      r.head.position.z = 0.17;
      return r;
    },
    frog: () => rig(frogBody, frogThroat, null, 1.7),
    dispose: () => {
      for (const g of geos) g.dispose();
      mat.dispose();
    },
  };
}
