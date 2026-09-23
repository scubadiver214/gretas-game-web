"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  type PointLight,
} from "three";
import { fitDistance } from "@/components/three/FitCamera";
import { C } from "@/design/tokens";
import { Character } from "@/features/characters/Character";
import type { CharacterId } from "@/features/player/types";
import { shakeOffset, useJuice } from "@/lib/fx";
import { TOPPINGS, TOPPING_BY_ID, type ToppingId } from "./scoring";
import { useKitchenGame } from "./useKitchenGame";

const COUNTER_TOP = 0.9;
const PIZZA_HOME: [number, number, number] = [0, COUNTER_TOP + 0.04, 0.1];
const PIZZA_OVEN: [number, number, number] = [1.45, COUNTER_TOP + 0.5, -0.85];
const OVEN_MOUTH: [number, number, number] = [1.45, 1.0, -0.29];

const DOUGH = new Color("#E8C27A");
const GOLDEN = new Color("#C98A3A");
const BURNT = new Color("#3B2A1A");

const CAMERA_TARGET: [number, number, number] = [0, 1.0, 0.15];
const CAMERA_FIT_WIDTH = 4.2;
const CAMERA_VFOV = 46;
const CAMERA_MIN_DISTANCE = 4.6;
const CAMERA_ELEVATION = 27;

const SPARKLE_COUNT = 26;

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

/** Red/white checkerboard, drawn once to a canvas and tiled across the floor. */
function useCheckerTexture(a = C.sandSoft, b = C.sand) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = a;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = b;
    g.fillRect(0, 0, 64, 64);
    g.fillRect(64, 64, 64, 64);
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(10, 10);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [a, b]);
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
  const lastPlaced = useRef(0);
  const bounce = useRef(0);

  const inOven = phase === "baking";
  useFrame((_, delta) => {
    if (!group.current) return;
    const target = inOven ? PIZZA_OVEN : PIZZA_HOME;
    const k = 1 - Math.pow(0.001, delta);
    group.current.position.x = MathUtils.lerp(group.current.position.x, target[0], k);
    group.current.position.y = MathUtils.lerp(group.current.position.y, target[1], k);
    group.current.position.z = MathUtils.lerp(group.current.position.z, target[2], k);
    group.current.rotation.y += delta * 0.4;
    // Little squash when a topping lands.
    if (placed.length !== lastPlaced.current) {
      lastPlaced.current = placed.length;
      bounce.current = 1;
    }
    bounce.current = Math.max(0, bounce.current - delta * 5);
    const b = bounce.current;
    group.current.scale.set(1 + 0.12 * b, 1 - 0.25 * b, 1 + 0.12 * b);
    if (baseMat.current) {
      const p = phase === "served" ? (lastBake === "burnt" ? 1 : lastBake === "raw" ? 0.2 : lastBake === null ? 0 : 0.75) : progress;
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
        const ne = e.nativeEvent as PointerEvent;
        const at = typeof window !== "undefined" && ne ? { x: ne.clientX / window.innerWidth, y: ne.clientY / window.innerHeight - 0.06 } : undefined;
        addTopping(id, at);
      }}
      onPointerOver={() => (hovered.current = true)}
      onPointerOut={() => (hovered.current = false)}
    >
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.16, 0.12, 20]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.215, 0.215, 0.03, 20]} />
        <meshStandardMaterial color={info.color} />
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
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    const on = phase === "baking";
    const pulse = on ? 1.2 + Math.sin(clock.getElapsedTime() * 6) * 0.5 : 0.05;
    if (glow.current) glow.current.emissiveIntensity = MathUtils.lerp(glow.current.emissiveIntensity, pulse, 0.1);
    if (light.current) light.current.intensity = MathUtils.lerp(light.current.intensity, on ? 6 : 0, 0.1);
  });
  return (
    <group position={[1.45, 0, -0.85]}>
      {/* Oven: blue appliance shell with a terracotta dome on top */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.7, 1.1]} />
        <meshStandardMaterial color={C.blue} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.crust} />
      </mesh>
      {/* Panel seams */}
      {[0.35, 0.75, 1.15, 1.5].map((y) => (
        <mesh key={y} position={[0, y, 0.556]}>
          <boxGeometry args={[1.2, 0.02, 0.01]} />
          <meshStandardMaterial color={C.blueDeep} />
        </mesh>
      ))}
      {/* Oven mouth */}
      <mesh position={[0, 1.0, 0.56]}>
        <boxGeometry args={[0.9, 0.55, 0.02]} />
        <meshStandardMaterial ref={glow} color="#1F2937" emissive="#FF7A18" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 1.27, 0.56]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.02, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <pointLight ref={light} position={[0, 1.0, 0.9]} intensity={0} color="#FF9A3C" distance={3} />
      {/* Chimney */}
      <mesh position={[0, 2.3, -0.2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 12]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Pizza peel leaning on the oven */}
      <mesh position={[0.75, 0.9, 0.3]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.04, 1.8, 0.04]} />
        <meshStandardMaterial color="#B07A4B" />
      </mesh>
      <mesh position={[0.6, 1.75, 0.3]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.35, 0.02, 0.35]} />
        <meshStandardMaterial color="#D9B99B" />
      </mesh>
    </group>
  );
}

/** Golden sparkles that burst out of the oven on a perfect bake. */
function Sparkles() {
  const refs = useRef<(Mesh | null)[]>([]);
  const state = useRef(Array.from({ length: SPARKLE_COUNT }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })));
  const seen = useRef(0);
  useFrame((_, delta) => {
    const perfectAt = useKitchenGame.getState().perfectAt;
    if (perfectAt !== seen.current) {
      seen.current = perfectAt;
      state.current.forEach((p, i) => {
        p.life = 0.6 + Math.random() * 0.5;
        p.x = OVEN_MOUTH[0];
        p.y = OVEN_MOUTH[1];
        p.z = OVEN_MOUTH[2];
        const a = (i / SPARKLE_COUNT) * Math.PI * 2;
        p.vx = Math.cos(a) * (0.8 + Math.random());
        p.vz = 1.2 + Math.random() * 1.5;
        p.vy = 1.5 + Math.random() * 2;
      });
    }
    state.current.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      if (p.life <= 0) {
        m.visible = false;
        return;
      }
      p.life -= delta;
      p.vy -= 6 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      m.visible = true;
      m.position.set(p.x, p.y, p.z);
      m.scale.setScalar(0.05 + Math.min(1, p.life) * 0.06);
      m.rotation.y += delta * 6;
    });
  });
  return (
    <>
      {Array.from({ length: SPARKLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#FDE68A" emissive="#F2B134" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </>
  );
}

function Shelf({ position, jars }: { position: [number, number, number]; jars: string[] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.06, 0.35]} />
        <meshStandardMaterial color="#B07A4B" />
      </mesh>
      {jars.map((c, i) => (
        <group key={i} position={[-0.6 + i * 0.4, 0.17, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.28, 14]} />
            <meshStandardMaterial color={c} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 14]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HangingLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 3.2, z]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 6]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh>
        <coneGeometry args={[0.28, 0.3, 16, 1, true]} />
        <meshStandardMaterial color="#F2542D" side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#FFF3C4" emissive="#FDE68A" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function StripedAwning() {
  const stripes = 12;
  const width = 5.4;
  const w = width / stripes;
  return (
    <group position={[0, 2.6, -1.35]} rotation={[0.45, 0, 0]}>
      {Array.from({ length: stripes }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + w / 2 + i * w, 0, 0]} castShadow>
          <boxGeometry args={[w, 0.05, 0.9]} />
          <meshStandardMaterial color={i % 2 === 0 ? C.blue : "#FFFFFF"} />
        </mesh>
      ))}
      {Array.from({ length: stripes }).map((_, i) => (
        <mesh key={`s${i}`} position={[-width / 2 + w / 2 + i * w, -0.04, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w / 2, w / 2, 0.05, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={i % 2 === 0 ? C.blue : "#FFFFFF"} />
        </mesh>
      ))}
    </group>
  );
}

function PizzaBoxes({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.06 + i * 0.12, 0]} rotation={[0, i * 0.15 - 0.2, 0]} castShadow>
          <boxGeometry args={[0.55, 0.11, 0.55]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
      <mesh position={[0, 0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 16]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
    </group>
  );
}

/** Aspect-aware camera with shake, replacing the static FitCamera. */
function ShakyCamera() {
  const size = useThree((s) => s.size);
  useFrame((state, delta) => {
    const cam = state.camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const d = fitDistance(aspect, CAMERA_VFOV, CAMERA_FIT_WIDTH, CAMERA_MIN_DISTANCE);
    const elev = MathUtils.degToRad(CAMERA_ELEVATION);
    const [tx, ty, tz] = CAMERA_TARGET;
    useJuice.getState().decayShake(delta);
    const [sx, sy] = shakeOffset();
    if (cam.fov !== CAMERA_VFOV) {
      cam.fov = CAMERA_VFOV;
      cam.updateProjectionMatrix();
    }
    cam.position.set(tx + sx, ty + Math.sin(elev) * d + sy, tz + Math.cos(elev) * d);
    cam.lookAt(tx + sx * 0.5, ty + sy * 0.5, tz);
  });
  return null;
}

function Kitchen({ character, color, hairColor }: { character: CharacterId; color?: string; hairColor?: string }) {
  const floor = useCheckerTexture();
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2, 3, 2]} intensity={10} color="#FFE6B3" />

      {/* Floor + back wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        {floor ? <meshStandardMaterial map={floor} /> : <meshStandardMaterial color="#E9DCCB" />}
      </mesh>
      <mesh position={[0, 2.5, -1.6]} receiveShadow>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Blue tile stripe, like the curb trim used all over the shop */}
      <mesh position={[0, 1.6, -1.59]}>
        <planeGeometry args={[20, 0.9]} />
        <meshStandardMaterial color={C.blue} />
      </mesh>
      {/* Window with a sunny view */}
      <mesh position={[-2.6, 2.45, -1.57]}>
        <boxGeometry args={[1.5, 1.1, 0.04]} />
        <meshStandardMaterial color="#BFE7FF" emissive="#BFE7FF" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-2.6, 2.45, -1.54]}>
        <boxGeometry args={[1.56, 0.06, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-2.6, 2.45, -1.54]}>
        <boxGeometry args={[0.06, 1.16, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-2.6, 2.45, -1.52]}>
        <boxGeometry args={[1.6, 1.2, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0} />
      </mesh>
      {/* Menu board */}
      <mesh position={[0, 2.45, -1.57]}>
        <boxGeometry args={[1.5, 0.9, 0.04]} />
        <meshStandardMaterial color="#2B2D42" />
      </mesh>
      {[0.25, 0.05, -0.15].map((dy, i) => (
        <mesh key={i} position={[-0.15 + i * 0.05, 2.45 + dy, -1.54]}>
          <boxGeometry args={[0.9 - i * 0.15, 0.06, 0.01]} />
          <meshStandardMaterial color={[C.sun, "#FFFFFF", C.blueSoft][i]} />
        </mesh>
      ))}
      <mesh position={[0.5, 2.7, -1.54]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.16, 20]} />
        <meshStandardMaterial color={C.sun} />
      </mesh>
      <mesh position={[0.5, 2.7, -1.53]}>
        <circleGeometry args={[0.12, 20]} />
        <meshStandardMaterial color={C.tomato} />
      </mesh>

      <StripedAwning />
      <Shelf position={[2.6, 2.3, -1.4]} jars={[C.tomato, C.grass, C.sun, C.crust]} />
      <HangingLamp x={-1.4} z={0.2} />
      <HangingLamp x={1.4} z={0.2} />

      {/* Counter: blue plastic body with a white worktop */}
      <mesh position={[0, COUNTER_TOP / 2, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.6, COUNTER_TOP, 1.5]} />
        <meshStandardMaterial color={C.blue} />
      </mesh>
      <mesh position={[0, COUNTER_TOP + 0.01, 0.2]} receiveShadow>
        <boxGeometry args={[3.7, 0.05, 1.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Counter front trim */}
      <mesh position={[0, 0.25, 0.96]}>
        <boxGeometry args={[3.6, 0.08, 0.02]} />
        <meshStandardMaterial color={C.sun} />
      </mesh>
      <PizzaBoxes position={[1.55, COUNTER_TOP + 0.03, -0.05]} />
      {/* Flour sack + rolling pin */}
      <mesh position={[1.0, COUNTER_TOP + 0.1, 0.5]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.22]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.7, COUNTER_TOP + 0.06, -0.4]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 10]} />
        <meshStandardMaterial color="#D9B99B" />
      </mesh>

      <Oven />
      <Pizza />
      <Sparkles />
      {TOPPINGS.map((t, i) => (
        <Bowl key={t.id} id={t.id} index={i} />
      ))}

      <Character character={character} color={color} hairColor={hairColor} pose="cook" position={[-1.15, 0, -0.9]} rotation={[0, 0.25, 0]} scale={0.95} />
    </>
  );
}

export default function KitchenScene({
  character,
  color,
  hairColor,
}: {
  character: CharacterId;
  color?: string;
  hairColor?: string;
}) {
  return (
    <Canvas shadows="percentage" dpr={[1, 1.75]}>
      <ShakyCamera />
      <color attach="background" args={[C.blueSoft]} />
      <Kitchen character={character} color={color} hairColor={hairColor} />
    </Canvas>
  );
}
