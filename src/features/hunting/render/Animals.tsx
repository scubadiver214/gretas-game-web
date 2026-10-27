"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { HuntEngine } from "../engine/HuntEngine";
import type { Animal } from "../types";
import { createBirdKit, foldWings, openWings, poseWings, type BirdKind, type BirdRig } from "./models/birds";
import { createCritterKit, type CritterRig } from "./models/critters";

const _target = new Vector3();

type WildRig = { kind: "bird"; rig: BirdRig; pitch: number } | { kind: "critter"; rig: CritterRig };

const SWIM_Y: Partial<Record<Animal["species"], number>> = { mallard: 0.035, woodDuck: 0.035, swan: 0.06, loon: 0.0 };

function birdKindFor(a: Animal): BirdKind | null {
  switch (a.species) {
    case "mallard":
      return a.variant === 1 ? "mallardHen" : "mallardDrake";
    case "woodDuck":
      return a.variant === 1 ? "woodHen" : "woodDrake";
    case "swan":
      return "swan";
    case "loon":
      return "loon";
    case "heron":
      return "heron";
    case "kingfisher":
      return "kingfisher";
    default:
      return null;
  }
}

/** Flying ducks and the lake's wildlife, drawn from pooled procedural rigs. */
export function Animals({ engine }: { engine: HuntEngine }) {
  const ducksGroup = useRef<Group>(null);
  const wildGroup = useRef<Group>(null);
  const birds = useMemo(() => createBirdKit(), []);
  const critters = useMemo(() => createCritterKit(), []);
  useEffect(
    () => () => {
      birds.dispose();
      critters.dispose();
    },
    [birds, critters],
  );

  const duckRigs = useRef(new Map<number, BirdRig>());
  const freeDucks = useRef<Record<string, BirdRig[]>>({ mallardDrake: [], mallardHen: [] });
  const wildRigs = useRef(new Map<number, WildRig>());
  const wildSource = useRef<Animal[] | null>(null);

  useFrame((_, delta) => {
    const dg = ducksGroup.current;
    const wg = wildGroup.current;
    if (!dg || !wg) return;

    // Flying ducks: reuse rigs by id, return them to the pool when the duck is gone.
    const seen = new Set<number>();
    for (const d of engine.ducks) {
      seen.add(d.id);
      let rig = duckRigs.current.get(d.id);
      if (!rig) {
        const kind: BirdKind = d.hen ? "mallardHen" : "mallardDrake";
        rig = freeDucks.current[kind].pop() ?? birds.create(kind);
        if (!rig.root.parent) dg.add(rig.root);
        rig.root.visible = true;
        openWings(rig);
        duckRigs.current.set(d.id, rig);
      }
      rig.root.position.set(d.pos.x, d.pos.y, d.pos.z);
      _target.set(d.pos.x + d.vel.x, d.pos.y + d.vel.y, d.pos.z + d.vel.z);
      rig.root.lookAt(_target);
      rig.body.rotation.z = -d.bank;
      rig.head.rotation.z = d.bank * 0.5;
      let s = d.size;
      if (d.phase === "hit") {
        const t = d.phaseT;
        s *= t < 0.07 ? 1 + (t / 0.07) * 0.3 : Math.max(0, 1.3 * (1 - (t - 0.07) / 0.18));
      }
      rig.root.scale.setScalar(Math.max(0.0001, s));
      poseWings(rig, d.flap, d.phase === "hit" ? 1 : d.glide);
    }
    for (const [id, rig] of duckRigs.current) {
      if (seen.has(id)) continue;
      rig.root.visible = false;
      freeDucks.current[rig.kind]?.push(rig);
      duckRigs.current.delete(id);
    }

    // Wildlife: rebuilt whenever the engine resets its animal list.
    if (wildSource.current !== engine.wildlife) {
      for (const w of wildRigs.current.values()) wg.remove(w.rig.root);
      wildRigs.current.clear();
      for (const a of engine.wildlife) {
        const kind = birdKindFor(a);
        let w: WildRig;
        if (kind) w = { kind: "bird", rig: birds.create(kind), pitch: 0 };
        else w = { kind: "critter", rig: a.species === "turtle" ? critters.turtle() : critters.frog() };
        wg.add(w.rig.root);
        wildRigs.current.set(a.id, w);
      }
      wildSource.current = engine.wildlife;
    }
    const t = engine.clock;
    for (const a of engine.wildlife) {
      const w = wildRigs.current.get(a.id);
      if (!w) continue;
      w.rig.root.visible = a.visible;
      if (!a.visible) continue;
      if (w.kind === "critter") {
        const r = w.rig;
        r.root.position.set(a.pos.x, a.pos.y, a.pos.z);
        r.root.rotation.y = a.heading;
        if (a.species === "turtle") {
          r.head.position.y = 0.01 + Math.sin(t * 0.7 + a.seed * 9) * 0.008;
          r.head.rotation.y = Math.sin(t * 0.4 + a.seed * 4) * 0.35;
        } else {
          const croak = Math.max(0, Math.sin(t * 5 + a.seed * 7));
          r.head.scale.setScalar(1 + croak * croak * 0.5);
          r.body.rotation.x = a.action === "hop" ? -0.5 * Math.sin(Math.PI * Math.min(1, a.actionT / a.actionLen)) : 0;
        }
        continue;
      }
      const rig = w.rig;
      const swimY = SWIM_Y[a.species];
      if (swimY !== undefined) {
        foldWings(rig);
        const bob = Math.sin(t * 1.9 + a.seed * 20) * 0.012;
        rig.root.position.set(a.pos.x, swimY + bob, a.pos.z);
        rig.root.rotation.set(0, a.heading, Math.sin(t * 1.3 + a.seed * 11) * 0.03);
        const wantPitch = a.action === "dabble" ? 1.15 : 0;
        w.pitch += (wantPitch - w.pitch) * Math.min(1, delta * 5);
        rig.body.rotation.x = w.pitch;
        rig.body.position.y = w.pitch * 0.05;
        rig.head.rotation.y = a.action === "swim" ? Math.sin(t * 0.8 + a.seed * 30) * 0.4 : 0;
        continue;
      }
      if (a.species === "heron") {
        rig.root.position.set(a.pos.x, a.pos.y + 1.04, a.pos.z);
        rig.root.rotation.set(0, a.heading, 0);
        if (a.action === "fly") {
          openWings(rig);
          poseWings(rig, a.flap, 0, 0.75);
          rig.body.rotation.x = 0.4;
          for (const leg of rig.legs) leg.rotation.x = 1.6;
          rig.neck.rotation.x = 0.25;
        } else {
          foldWings(rig);
          rig.body.rotation.x = 0;
          const k = Math.min(1, a.actionT / a.actionLen);
          rig.neck.rotation.x = a.action === "strike" ? Math.sin(Math.PI * k) * 0.55 : Math.sin(t * 0.5 + a.seed) * 0.04;
          rig.head.rotation.y = a.action === "stand" ? Math.sin(t * 0.6 + a.seed * 5) * 0.5 : 0;
          const step = a.action === "stalk" ? Math.sin(a.actionT * 3.2) * 0.25 : 0;
          rig.legs.forEach((leg, i) => (leg.rotation.x = 0.45 + (i === 0 ? step : -step)));
        }
        continue;
      }
      // Kingfisher.
      rig.root.position.set(a.pos.x, a.pos.y + (a.action === "perch" ? 0.07 : 0), a.pos.z);
      rig.root.rotation.set(0, a.heading, 0);
      if (a.action === "perch") {
        foldWings(rig);
        rig.body.rotation.x = -0.35 + Math.sin(t * 2.2) * 0.04;
        rig.head.rotation.y = Math.sin(t * 1.7 + a.seed) * 0.6;
      } else if (a.action === "dive") {
        foldWings(rig);
        rig.body.rotation.x = 1.3;
      } else {
        openWings(rig);
        poseWings(rig, a.flap, 0, 0.9);
        rig.body.rotation.x = a.action === "hover" ? -0.6 : 0;
      }
    }
  });

  return (
    <>
      <group ref={ducksGroup} />
      <group ref={wildGroup} />
    </>
  );
}
