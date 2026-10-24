import { Group, Mesh } from "three";
import type { MeshKit } from "@/components/three/kit";
import { CLAW } from "../../config";

export interface ClawRig {
  /** Pivot at the rail; swing rotates this. */
  pivot: Group;
  /** Cable from the rail to the head, scaled by the drop. */
  cable: Mesh;
  /** The head; its y is minus the drop. */
  head: Group;
  /** Three finger pivots; rotate outward to open. */
  fingers: Group[];
}

const FINGER_LEN = CLAW.fingerLength;

/**
 * Chrome three-finger claw on a cable. The fingers hinge at the bottom of the
 * head: 0 = closed (tips touching under the head), 1 = fully open.
 */
export function buildClaw(kit: MeshKit, accent: string): ClawRig {
  const chrome = { rough: 0.25, metal: 0.8, flat: false } as const;
  const pivot = new Group();

  const cable = new Mesh(kit.cylinder(0.025, 0.025, 1, 8), kit.mat("#333A4B", { rough: 0.6, flat: false }));
  cable.position.y = -0.5;
  cable.castShadow = false;
  pivot.add(cable);

  const head = new Group();
  pivot.add(head);
  const cap = new Mesh(kit.cylinder(0.16, 0.26, 0.26, 12), kit.mat("#DDE4F0", chrome));
  cap.position.y = -0.13;
  cap.castShadow = true;
  head.add(cap);
  const collar = new Mesh(kit.cylinder(0.28, 0.28, 0.1, 12), kit.mat(accent, { rough: 0.4, flat: false }));
  collar.position.y = -0.3;
  collar.castShadow = true;
  head.add(collar);
  const bell = new Mesh(kit.sphere(0.26, 12, 8, Math.PI / 2), kit.mat("#DDE4F0", chrome));
  bell.position.y = -0.3;
  bell.rotation.x = Math.PI;
  bell.castShadow = true;
  head.add(bell);

  const fingers: Group[] = [];
  const upperGeo = kit.cylinder(0.04, 0.05, FINGER_LEN * 0.55, 8);
  const lowerGeo = kit.cylinder(0.025, 0.04, FINGER_LEN * 0.5, 8);
  const tipGeo = kit.sphere(0.05, 8, 6);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const hinge = new Group();
    hinge.position.set(Math.cos(a) * 0.2, -0.36, Math.sin(a) * 0.2);
    hinge.rotation.y = -a;
    // Finger shapes live in the hinge's local frame: +x points outward.
    const upper = new Mesh(upperGeo, kit.mat("#DDE4F0", chrome));
    upper.position.set(0.08, -FINGER_LEN * 0.27, 0);
    upper.rotation.z = 0.5;
    upper.castShadow = true;
    hinge.add(upper);
    const lower = new Mesh(lowerGeo, kit.mat("#DDE4F0", chrome));
    lower.position.set(0.1, -FINGER_LEN * 0.75, 0);
    lower.rotation.z = -0.55;
    lower.castShadow = true;
    hinge.add(lower);
    const tip = new Mesh(tipGeo, kit.mat(accent, { rough: 0.4, flat: false }));
    tip.position.set(-0.02, -FINGER_LEN * 0.98, 0);
    hinge.add(tip);
    head.add(hinge);
    fingers.push(hinge);
  }
  return { pivot, cable, head, fingers };
}

/** Poses the rig for a cable extension, jaw opening and swing angles. */
export function poseClaw(rig: ClawRig, drop: number, jaw: number, swingX: number, swingZ: number): void {
  rig.pivot.rotation.set(swingZ, 0, -swingX);
  const len = Math.max(0.05, drop);
  rig.cable.scale.y = len;
  rig.cable.position.y = -len / 2;
  rig.head.position.y = -drop;
  // Closed fingers lean slightly inward; open ones splay out.
  const angle = -0.18 + jaw * 0.95;
  for (const f of rig.fingers) f.rotation.z = angle;
}
