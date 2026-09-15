"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, MathUtils, type Group, type MeshStandardMaterial } from "three";
import FitCamera from "@/components/three/FitCamera";
import { Character } from "@/features/characters/Character";
import type { CharacterId } from "@/features/player/types";
import { TOPPINGS, TOPPING_BY_ID, type ToppingId } from "./scoring";
import { useKitchenGame } from "./useKitchenGame";

const COUNTER_TOP = 0.9;
const PIZZA_HOME: [number, number, number] = [0, COUNTER_TOP + 0.04, 0.1];
const PIZZA_OVEN: [number, number, number] = [1.45, COUNTER_TOP + 0.5, -0.85];

const DOUGH = new Color("#E8C27A");
const GOLDEN = new Color("#C98A3A");
const BURNT = new Color("#3B2A1A");

/** Deterministic scatter positions so toppings don't jump between renders. */
function scatter(seed: number, count: number, radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i + seed * 0.37) * 2.399963; // golden angle
    const r = radius * Math.sqrt((i + 0.5) / count);
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

function ToppingPieces({ id, index }: { id: ToppingId; index: number }) {
  const info = TOPPING_BY_ID[id];
  const pieces = useMemo(() => scatter(index + 1, id === "cheese" ? 1 : 6, 0.36), [id, index]);
  const y = 0.045 + index * 0.012;
  if (id === "cheese") {
    return (
      <mesh position={[0, y, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.015, 32]} />
        <meshStandardMaterial color={info.color} />
      </mesh>
    );
  }
  return (
    <group>
      {pieces.map(([x, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.7, 0]}>
          {id === "pepperoni" && <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />}
          {id === "mushroom" && <sphereGeometry args={[0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />}
          {id === "olive" && <torusGeometry args={[0.04, 0.02, 8, 12]} />}
          {id === "pepper" && <boxGeometry args={[0.12, 0.02, 0.04]} />}
          {id === "basil" && <boxGeometry args={[0.1, 0.01, 0.07]} />}
          <meshStandardMaterial color={info.color} />
        </mesh>
      ))}
    </group>
  );
}

function Pizza() {
  const group = useRef<Group>(null);
  const baseMat = useRef<MeshStandardMaterial>(null);
  const phase = useKitchenGame((s) => s.phase);
  const placed = useKitchenGame((s) => s.placed);
  const progress = useKitchenGame((s) => s.bakeProgress);
  const lastBake = useKitchenGame((s) => s.lastBake);

  const inOven = phase === "baking";
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = inOven ? PIZZA_OVEN : PIZZA_HOME;
    const k = 1 - Math.pow(0.001, delta);
    group.current.position.x = MathUtils.lerp(group.current.position.x, target[0], k);
    group.current.position.y = MathUtils.lerp(group.current.position.y, target[1], k);
    group.current.position.z = MathUtils.lerp(group.current.position.z, target[2], k);
    group.current.rotation.y += delta * 0.4;
    if (baseMat.current) {
      const p = phase === "served" ? (lastBake === "burnt" ? 1 : lastBake === "raw" ? 0.2 : 0.75) : progress;
      const c = p < 0.85 ? DOUGH.clone().lerp(GOLDEN, p / 0.85) : GOLDEN.clone().lerp(BURNT, (p - 0.85) / 0.15);
      baseMat.current.color.copy(c);
    }
  });

  return (
    <group ref={group} position={PIZZA_HOME}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.56, 0.52, 0.06, 40]} />
        <meshStandardMaterial ref={baseMat} color={DOUGH} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.01, 40]} />
        <meshStandardMaterial color="#C8342A" />
      </mesh>
      {placed.map((id, i) => (
        <ToppingPieces key={`${id}-${i}`} id={id} index={i} />
      ))}
    </group>
  );
}

function Bowl({ id, index }: { id: ToppingId; index: number }) {
  const addTopping = useKitchenGame((s) => s.addTopping);
  const phase = useKitchenGame((s) => s.phase);
  const info = TOPPING_BY_ID[id];
  const mesh = useRef<Group>(null);
  const x = -1.3 + index * 0.52;
  const hovered = useRef(false);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const target = hovered.current && phase === "topping" ? 1.15 : 1;
    const s = MathUtils.lerp(mesh.current.scale.x, target, 1 - Math.pow(0.001, delta));
    mesh.current.scale.setScalar(s);
  });
  const contents = useMemo(() => scatter(index + 3, 5, 0.12), [index]);
  return (
    <group
      ref={mesh}
      position={[x, COUNTER_TOP, 0.72]}
      onClick={(e) => {
        e.stopPropagation();
        addTopping(id);
      }}
      onPointerOver={() => (hovered.current = true)}
      onPointerOut={() => (hovered.current = false)}
    >
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.16, 0.12, 20]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {contents.map(([cx, cz], i) => (
        <mesh key={i} position={[cx * 0.85, 0.13, cz * 0.85]}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color={info.color} />
        </mesh>
      ))}
    </group>
  );
}

function Oven() {
  const phase = useKitchenGame((s) => s.phase);
  const glow = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!glow.current) return;
    const on = phase === "baking";
    const pulse = on ? 1.2 + Math.sin(clock.getElapsedTime() * 6) * 0.5 : 0.05;
    glow.current.emissiveIntensity = MathUtils.lerp(glow.current.emissiveIntensity, pulse, 0.1);
  });
  return (
    <group position={[1.45, 0, -0.85]}>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.7, 1.1]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      {/* Oven mouth */}
      <mesh position={[0, 1.0, 0.56]}>
        <boxGeometry args={[0.9, 0.55, 0.02]} />
        <meshStandardMaterial ref={glow} color="#1F2937" emissive="#FF7A18" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 1.75, -0.2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
}

function Kitchen({ character }: { character: CharacterId }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 6, 4]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2, 3, 2]} intensity={12} color="#FFE6B3" />

      {/* Floor + back wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#E9DCCB" />
      </mesh>
      <mesh position={[0, 2.5, -1.6]} receiveShadow>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#FFD9A8" />
      </mesh>
      {/* Wall tiles stripe */}
      <mesh position={[0, 1.6, -1.59]}>
        <planeGeometry args={[20, 0.9]} />
        <meshStandardMaterial color="#F7B267" />
      </mesh>

      {/* Counter */}
      <mesh position={[0, COUNTER_TOP / 2, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.6, COUNTER_TOP, 1.5]} />
        <meshStandardMaterial color="#B07A4B" />
      </mesh>
      <mesh position={[0, COUNTER_TOP + 0.01, 0.2]} receiveShadow>
        <boxGeometry args={[3.7, 0.05, 1.6]} />
        <meshStandardMaterial color="#F3E6D3" />
      </mesh>

      <Oven />
      <Pizza />
      {TOPPINGS.map((t, i) => (
        <Bowl key={t.id} id={t.id} index={i} />
      ))}

      <Character character={character} pose="cook" position={[-1.15, 0, -0.9]} rotation={[0, 0.25, 0]} scale={0.95} />
    </>
  );
}

const CAMERA_TARGET: [number, number, number] = [0, 0.85, 0.15];

export default function KitchenScene({ character }: { character: CharacterId }) {
  return (
    <Canvas shadows dpr={[1, 1.75]}>
      <FitCamera fitWidth={4.2} vfov={46} minDistance={4.6} elevationDeg={34} target={CAMERA_TARGET} />
      <color attach="background" args={["#FFF1D6"]} />
      <Kitchen character={character} />
    </Canvas>
  );
}
