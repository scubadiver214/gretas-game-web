"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { Character, type CharacterPose } from "@/features/characters/Character";
import type { CharacterId } from "@/features/player/types";
import type { KitchenEngine } from "../engine/KitchenEngine";
import { matchesExactly, wrongComponents } from "../engine/pizza";
import { ItemMesh } from "./ItemMesh";
import { CHEF_SCALE, COUNTER_H, worldX, worldZ } from "./view";

export interface ChefLook {
  character: CharacterId;
  color?: string;
  hairColor?: string;
  skinColor?: string;
  /** Ring / marker colour; null when nobody on this device controls the chef. */
  marker: string | null;
  /** The chef this device is steering right now (solo swap). */
  active: boolean;
}

function HeldItem({ engine, index }: { engine: KitchenEngine; index: number }) {
  const item = engine.state.chefs[index]?.holding;
  if (!item) return null;
  const orders = engine.state.orders;
  const wrong = item.kind === "pizza" ? wrongComponents(item, orders) : undefined;
  const complete = item.kind === "pizza" && !item.sliced && item.bake === 0 && orders.some((o) => matchesExactly(item, o));
  return (
    <group position={[0, 0.5, 0.36]} scale={0.85}>
      <ItemMesh item={item} wrong={wrong} complete={complete} />
    </group>
  );
}

function ChefView({ engine, index, look, version }: { engine: KitchenEngine; index: number; look: ChefLook; version: number }) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const arrow = useRef<Group>(null);
  const [pose, setPose] = useState<CharacterPose>("idle");
  const poseRef = useRef<CharacterPose>("idle");
  const facing = useRef(Math.PI);
  const placed = useRef(false);

  useFrame(({ clock }, dt) => {
    const chef = engine.state.chefs[index];
    const g = root.current;
    if (!chef || !g) return;
    const s = engine.state;
    const tx = worldX(s, chef.x);
    const tz = worldZ(s, chef.z);
    if (!placed.current) {
      g.position.set(tx, 0, tz);
      placed.current = true;
    } else {
      const k = 1 - Math.pow(0.0001, dt);
      g.position.x += (tx - g.position.x) * k;
      g.position.z += (tz - g.position.z) * k;
    }
    let diff = chef.facing - facing.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    facing.current += diff * Math.min(1, dt * 16);
    if (body.current) body.current.rotation.y = facing.current;

    const speed = Math.hypot(chef.vx, chef.vz);
    const next: CharacterPose = chef.working ? "cook" : speed > 0.6 ? "run" : "idle";
    if (next !== poseRef.current) {
      poseRef.current = next;
      setPose(next);
    }
    if (ring.current) {
      const m = ring.current.material as MeshBasicMaterial;
      m.opacity = look.active ? 0.75 + Math.sin(clock.getElapsedTime() * 5) * 0.2 : 0.35;
    }
    if (arrow.current) {
      arrow.current.visible = look.active;
      arrow.current.position.y = 1.45 + Math.sin(clock.getElapsedTime() * 4) * 0.06;
      arrow.current.rotation.y += dt * 2;
    }
  });

  return (
    <group ref={root}>
      {look.marker && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.3, 0.4, 28]} />
          <meshBasicMaterial color={look.marker} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}
      {look.marker && (
        <group ref={arrow} position={[0, 1.45, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.1, 0.18, 4]} />
            <meshBasicMaterial color={look.marker} />
          </mesh>
        </group>
      )}
      <group ref={body}>
        <Character character={look.character} color={look.color} hairColor={look.hairColor} skinColor={look.skinColor} pose={pose} scale={CHEF_SCALE} />
        <group userData={{ version }}>
          <HeldItem engine={engine} index={index} />
        </group>
      </group>
    </group>
  );
}

/** Glowing frame on the station a controlled chef is facing. */
function TargetFrame({ engine, index, color }: { engine: KitchenEngine; index: number; color: string }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    const chef = engine.state.chefs[index];
    if (!g.current) return;
    const st = chef && chef.target !== null ? engine.state.stations[chef.target] : null;
    g.current.visible = !!st && engine.state.phase === "playing";
    if (!st) return;
    const s = engine.state;
    g.current.position.set(worldX(s, st.tx + 0.5), (st.kind === "bin" ? 0.62 : COUNTER_H) + 0.02, worldZ(s, st.tz + 0.5));
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 7) * 0.03;
    g.current.scale.set(pulse, 1, pulse);
  });
  const edge = (x: number, z: number, w: number, d: number, key: string) => (
    <mesh key={key} position={[x, 0, z]}>
      <boxGeometry args={[w, 0.03, d]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
  return (
    <group ref={g}>
      {edge(0, -0.48, 1, 0.05, "n")}
      {edge(0, 0.48, 1, 0.05, "s")}
      {edge(-0.48, 0, 0.05, 1, "w")}
      {edge(0.48, 0, 0.05, 1, "e")}
    </group>
  );
}

export default function Chefs({ engine, looks, version }: { engine: KitchenEngine; looks: ChefLook[]; version: number }) {
  return (
    <group>
      {engine.state.chefs.map((c, i) => {
        const look = looks[i] ?? looks[0];
        return (
          <group key={`${c.id}-${engine.state.width}`}>
            <ChefView engine={engine} index={i} look={look} version={version} />
            {look.marker && look.active && <TargetFrame engine={engine} index={i} color={look.marker} />}
          </group>
        );
      })}
    </group>
  );
}
