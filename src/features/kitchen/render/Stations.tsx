"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { BAKE } from "../config";
import { INGREDIENT_BY_ID } from "../content/ingredients";
import type { KitchenEngine } from "../engine/KitchenEngine";
import { matchesExactly, wrongComponents } from "../engine/pizza";
import type { KitchenState, Station } from "../engine/types";
import { ItemMesh } from "./ItemMesh";
import { badgeTexture, brickTexture, woodTexture } from "./textures";
import { COUNTER_H, worldX, worldZ } from "./view";

const COUNTER_SIDE = "#3E6E8E";
const COUNTER_TOP = "#F4F1EA";
const STEEL = "#C9D1DB";

/** Direction (radians) a station faces: towards the floor tile next to it. */
function stationFacing(state: KitchenState, st: Station): number {
  const open = (dx: number, dz: number) => {
    const x = st.tx + dx;
    const z = st.tz + dz;
    return x >= 0 && z >= 0 && x < state.width && z < state.depth && !state.solid[z * state.width + x];
  };
  if (open(0, 1)) return 0;
  if (open(1, 0)) return Math.PI / 2;
  if (open(-1, 0)) return -Math.PI / 2;
  if (open(0, -1)) return Math.PI;
  return 0;
}

function CounterBody({ side = COUNTER_SIDE, top = COUNTER_TOP }: { side?: string; top?: string }) {
  return (
    <group>
      <mesh position={[0, COUNTER_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.98, COUNTER_H, 0.98]} />
        <meshStandardMaterial color={side} />
      </mesh>
      <mesh position={[0, COUNTER_H - 0.02, 0]} receiveShadow>
        <boxGeometry args={[1, 0.05, 1]} />
        <meshStandardMaterial color={top} />
      </mesh>
    </group>
  );
}

function Label({ emoji, bg, y = 0.62, size = 0.36 }: { emoji: string; bg: string; y?: number; size?: number }) {
  return (
    <sprite position={[0, COUNTER_H + y, 0.05]} scale={[size, size, size]} renderOrder={5}>
      <spriteMaterial map={badgeTexture(emoji, bg)} transparent depthWrite={false} />
    </sprite>
  );
}

function Pantry({ st }: { st: Station }) {
  const def = st.ingredient ? INGREDIENT_BY_ID[st.ingredient] : null;
  const wood = woodTexture();
  const fill = def ? (def.rawColor ?? def.color) : "#999";
  return (
    <group>
      <CounterBody side="#6B4A2E" top="#8A6038" />
      {/* Open crate */}
      <group position={[0, COUNTER_H, 0]}>
        {[
          [0, 0.13, 0.36, 0.84, 0.26, 0.06],
          [0, 0.13, -0.36, 0.84, 0.26, 0.06],
          [0.4, 0.13, 0, 0.06, 0.26, 0.78],
          [-0.4, 0.13, 0, 0.06, 0.26, 0.78],
        ].map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial map={wood} color="#E2B482" />
          </mesh>
        ))}
        {[-0.2, 0, 0.2].map((x) =>
          [-0.16, 0.12].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.18, z]}>
              <sphereGeometry args={[0.13, 10, 8]} />
              <meshStandardMaterial color={fill} />
            </mesh>
          )),
        )}
      </group>
      {def && <Label emoji={def.emoji} bg="#FFF4D6" />}
    </group>
  );
}

function DoughTable() {
  return (
    <group>
      <CounterBody side="#7A5232" />
      <mesh position={[0, COUNTER_H + 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.04, 0.9]} />
        <meshStandardMaterial map={woodTexture()} color="#F0D7B0" />
      </mesh>
      <mesh position={[0.05, COUNTER_H + 0.045, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, COUNTER_H + 0.08, -0.36]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 10]} />
        <meshStandardMaterial color="#D9B99B" />
      </mesh>
    </group>
  );
}

function ChoppingBoard() {
  return (
    <group>
      <CounterBody />
      <mesh position={[0, COUNTER_H + 0.025, 0]} receiveShadow>
        <boxGeometry args={[0.72, 0.04, 0.56]} />
        <meshStandardMaterial map={woodTexture()} color="#F5E2C4" />
      </mesh>
      <group position={[0.36, COUNTER_H + 0.06, -0.3]} rotation={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.012, 0.07]} />
          <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.21, 0.005, 0]}>
          <boxGeometry args={[0.13, 0.03, 0.04]} />
          <meshStandardMaterial color="#2B2D42" />
        </mesh>
      </group>
    </group>
  );
}

function Oven({ st, engine }: { st: Station; engine: KitchenEngine }) {
  const glow = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  const brick = brickTexture();
  useFrame(({ clock }) => {
    const live = engine.state.stations[st.id];
    const baking = live?.item?.kind === "pizza" && engine.state.phase === "playing";
    const burnt = baking && live.item!.kind === "pizza" && live.item!.bake >= BAKE.burnt;
    const target = baking ? 1.4 + Math.sin(clock.getElapsedTime() * (burnt ? 18 : 7)) * 0.5 : 0.15;
    if (glow.current) glow.current.emissiveIntensity += (target - glow.current.emissiveIntensity) * 0.15;
    if (light.current) light.current.intensity += ((baking ? 2.2 : 0) - light.current.intensity) * 0.15;
  });
  return (
    <group>
      <CounterBody side="#5B2E1E" top="#3B3F48" />
      {/* Brick dome at the back, the pizza sits on the hot deck in front */}
      <mesh position={[0, COUNTER_H, -0.18]} castShadow>
        <sphereGeometry args={[0.46, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={brick} color="#E9A27E" />
      </mesh>
      <mesh position={[0, COUNTER_H + 0.14, 0.2]}>
        <boxGeometry args={[0.5, 0.26, 0.08]} />
        <meshStandardMaterial ref={glow} color="#1F1410" emissive="#FF7A18" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.2, COUNTER_H + 0.55, -0.3]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 10]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      <pointLight ref={light} position={[0, COUNTER_H + 0.4, 0.35]} color="#FF9A3C" intensity={0} distance={2.2} />
    </group>
  );
}

function Slicer() {
  return (
    <group>
      <CounterBody />
      <mesh position={[0, COUNTER_H + 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.02, 24]} />
        <meshStandardMaterial color={STEEL} metalness={0.5} roughness={0.35} />
      </mesh>
      <group position={[0.38, COUNTER_H + 0.08, -0.34]} rotation={[0, 0.6, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.012, 16]} />
          <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
          <meshStandardMaterial color="#F2542D" />
        </mesh>
      </group>
      <Label emoji="🔪" bg="#DDE6F0" size={0.28} y={0.55} />
    </group>
  );
}

function Pass() {
  return (
    <group>
      <CounterBody side="#B23A2A" top={STEEL} />
      {/* Heat lamp gantry */}
      <mesh position={[0, COUNTER_H + 0.75, -0.3]}>
        <boxGeometry args={[0.95, 0.06, 0.16]} />
        <meshStandardMaterial color="#2B2D42" emissive="#FF3B2F" emissiveIntensity={0.6} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, COUNTER_H + 0.38, -0.3]}>
          <boxGeometry args={[0.05, 0.75, 0.05]} />
          <meshStandardMaterial color="#2B2D42" />
        </mesh>
      ))}
      <group position={[0.32, COUNTER_H, 0.3]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.03, 12]} />
          <meshStandardMaterial color="#2B2D42" />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.065, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F2B134" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <Label emoji="🛎️" bg="#FFD54D" y={0.95} />
    </group>
  );
}

function Bin() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.3, 0.6, 18]} />
        <meshStandardMaterial color="#4B5563" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <torusGeometry args={[0.33, 0.03, 6, 18]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.31, 18]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <Label emoji="🗑️" bg="#E5E7EB" y={0.35} size={0.3} />
    </group>
  );
}

/**
 * HUD-in-the-world materials: all transparent so three sorts them by
 * renderOrder in one pass (opaque meshes would draw before the backing plate).
 */
const OVERLAY = { transparent: true, depthTest: false, depthWrite: false } as const;

/** Thin progress bar that always faces the camera. */
function Bar({ value, color, track = "#0B0F17" }: { value: () => number | null; color: string; track?: string }) {
  const group = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  useFrame(() => {
    const v = value();
    if (!group.current || !fill.current) return;
    group.current.visible = v !== null;
    if (v === null) return;
    const w = Math.max(0.001, Math.min(1, v));
    fill.current.scale.x = w;
    fill.current.position.x = -0.33 + 0.33 * w;
  });
  return (
    <Billboard ref={group} position={[0, COUNTER_H + 0.7, 0]}>
      <mesh renderOrder={8}>
        <planeGeometry args={[0.74, 0.13]} />
        <meshBasicMaterial color={track} {...OVERLAY} opacity={0.85} />
      </mesh>
      <mesh ref={fill} position={[0, 0, 0.001]} renderOrder={9}>
        <planeGeometry args={[0.66, 0.07]} />
        <meshBasicMaterial color={color} {...OVERLAY} />
      </mesh>
    </Billboard>
  );
}

const OVEN_SPAN = BAKE.burnt + 0.15;

/** Oven timer: grey while raw, green for perfect, yellow for overdone, red for burnt. */
function OvenMeter({ engine, id }: { engine: KitchenEngine; id: number }) {
  const group = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const warn = useRef<Group>(null);
  const W = 1.05;
  const x = (bake: number) => -W / 2 + (Math.min(bake, OVEN_SPAN) / OVEN_SPAN) * W;
  const zone = (from: number, to: number, color: string, key: string) => (
    <mesh key={key} position={[(x(from) + x(to)) / 2, 0, 0.001]} renderOrder={9}>
      <planeGeometry args={[x(to) - x(from), 0.13]} />
      <meshBasicMaterial color={color} {...OVERLAY} />
    </mesh>
  );
  useFrame(({ clock }) => {
    const item = engine.state.stations[id]?.item;
    const on = item?.kind === "pizza";
    if (group.current) group.current.visible = on;
    if (!on || !marker.current) return;
    marker.current.position.x = x(item.bake);
    if (warn.current) {
      const hot = item.bake >= BAKE.warning && item.bake < BAKE.burnt;
      warn.current.visible = hot && Math.sin(clock.getElapsedTime() * 16) > -0.2;
    }
  });
  return (
    <Billboard ref={group} position={[0, COUNTER_H + 0.95, 0]}>
      <mesh renderOrder={8}>
        <planeGeometry args={[W + 0.08, 0.22]} />
        <meshBasicMaterial color="#0B0F17" {...OVERLAY} opacity={0.9} />
      </mesh>
      {zone(0, BAKE.cooked, "#6B7280", "raw")}
      {zone(BAKE.cooked, BAKE.perfectEnd, "#22C55E", "perfect")}
      {zone(BAKE.perfectEnd, BAKE.burnt, "#F59E0B", "good")}
      {zone(BAKE.burnt, OVEN_SPAN, "#EF4444", "burnt")}
      <mesh ref={marker} position={[0, 0, 0.002]} renderOrder={10}>
        <planeGeometry args={[0.05, 0.3]} />
        <meshBasicMaterial color="#FFFFFF" {...OVERLAY} />
      </mesh>
      <group ref={warn} position={[0, 0.24, 0]}>
        <sprite scale={[0.26, 0.26, 0.26]} renderOrder={11}>
          <spriteMaterial map={badgeTexture("❗", "#FDE68A")} depthTest={false} transparent />
        </sprite>
      </group>
    </Billboard>
  );
}

function StationItem({ engine, st }: { engine: KitchenEngine; st: Station }) {
  const item = st.item;
  if (!item) return null;
  const orders = engine.state.orders;
  const wrong = item.kind === "pizza" ? wrongComponents(item, orders) : undefined;
  const complete = item.kind === "pizza" && !item.sliced && item.bake === 0 && orders.some((o) => matchesExactly(item, o));
  const y = st.kind === "bin" ? 0.6 : COUNTER_H + (st.kind === "roll" || st.kind === "chop" ? 0.045 : 0.01);
  const z = st.kind === "oven" ? 0.12 : 0;
  return (
    <group position={[0, y, z]}>
      <ItemMesh item={item} wrong={wrong} complete={complete} />
    </group>
  );
}

function StationView({ engine, st }: { engine: KitchenEngine; st: Station }) {
  const state = engine.state;
  const facing = stationFacing(state, st);
  let body: React.ReactNode;
  switch (st.kind) {
    case "pantry":
      body = <Pantry st={st} />;
      break;
    case "roll":
      body = <DoughTable />;
      break;
    case "chop":
      body = <ChoppingBoard />;
      break;
    case "oven":
      body = <Oven st={st} engine={engine} />;
      break;
    case "slice":
      body = <Slicer />;
      break;
    case "pass":
      body = <Pass />;
      break;
    case "bin":
      body = <Bin />;
      break;
    default:
      body = <CounterBody />;
  }
  const workBar = st.kind === "roll" || st.kind === "chop" || st.kind === "slice";
  return (
    <group position={[worldX(state, st.tx + 0.5), 0, worldZ(state, st.tz + 0.5)]}>
      <group rotation={[0, facing, 0]}>
        {body}
        <StationItem engine={engine} st={st} />
      </group>
      {workBar && (
        <Bar
          color="#3DFF88"
          value={() => {
            const it = engine.state.stations[st.id]?.item;
            if (!it || it.work <= 0 || it.work >= 1) return null;
            return it.work;
          }}
        />
      )}
      {st.kind === "oven" && <OvenMeter engine={engine} id={st.id} />}
    </group>
  );
}

/** Every station in the kitchen; re-renders when `version` changes (items moved). */
export default function Stations({ engine, version }: { engine: KitchenEngine; version: number }) {
  return (
    <group key={engine.state.width * 1000 + engine.state.depth} userData={{ version }}>
      {engine.state.stations.map((st) => (
        <StationView key={`${st.id}-${st.kind}-${st.ingredient ?? ""}`} engine={engine} st={st} />
      ))}
    </group>
  );
}
