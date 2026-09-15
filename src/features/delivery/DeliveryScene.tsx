"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MathUtils, type Group, type Mesh, type PerspectiveCamera } from "three";
import { fitDistance } from "@/components/three/FitCamera";
import { Character } from "@/features/characters/Character";
import type { CharacterId } from "@/features/player/types";
import { LANE_X, pickSpawn, spawnIntervalFor, speedFor, type ItemKind } from "./scoring";
import { useDeliveryGame } from "./useDeliveryGame";

const CAMERA_VFOV = 55;
const CAMERA_FIT_WIDTH = 7.2; // both outer lanes + a mailbox on each side
const CAMERA_MIN_DISTANCE = 7.2;
const SPAWN_Z = -70;
const DESPAWN_Z = 6;
const HIT_RADIUS = 1.0;
const HOUSE_SPACING = 9;
const HOUSE_COUNT = 10;
const TREE_SPACING = 6;
const TREE_COUNT = 14;

interface PoolItem {
  kind: ItemKind;
  lane: number;
  z: number;
  active: boolean;
  done: boolean;
}

const HOUSE_COLORS = ["#F9A8D4", "#93C5FD", "#FCD34D", "#86EFAC", "#FDBA74", "#C4B5FD"];

function Bike({ character, color, pedaling, wobble }: { character: CharacterId; color?: string; pedaling: boolean; wobble: number }) {
  const front = useRef<Mesh>(null);
  const back = useRef<Mesh>(null);
  useFrame((_, delta) => {
    const spin = pedaling ? delta * 9 : 0;
    if (front.current) front.current.rotation.x -= spin;
    if (back.current) back.current.rotation.x -= spin;
  });
  return (
    <group>
      {/* Wheels */}
      <mesh ref={back} position={[0, 0.34, 0.55]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.32, 0.06, 10, 24]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh ref={front} position={[0, 0.34, -0.6]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.32, 0.06, 10, 24]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0.62, 0]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 1.1]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
      <mesh position={[0, 0.7, 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
      <mesh position={[0, 0.85, -0.5]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
      {/* Handlebar + seat */}
      <mesh position={[0, 1.1, -0.5]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, 0.98, 0.45]}>
        <boxGeometry args={[0.22, 0.06, 0.3]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Basket with a pizza box */}
      <mesh position={[0, 1.05, -0.9]}>
        <boxGeometry args={[0.5, 0.3, 0.4]} />
        <meshStandardMaterial color="#B07A4B" />
      </mesh>
      <mesh position={[0, 1.24, -0.9]}>
        <boxGeometry args={[0.42, 0.08, 0.34]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <Character character={character} color={color} pose="bike" pedaling={pedaling} wobble={wobble} position={[0, 0.72, 0.28]} rotation={[0, Math.PI, 0]} scale={0.85} />
    </group>
  );
}

function ItemMesh({ kind }: { kind: ItemKind }) {
  if (kind === "mailbox") {
    return (
      <group>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color="#6B4F2A" />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.5, 0.45, 0.7]} />
          <meshStandardMaterial color="#0E9594" emissive="#5EEAD4" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0.3, 1.3, 0]}>
          <boxGeometry args={[0.05, 0.3, 0.1]} />
          <meshStandardMaterial color="#F2542D" />
        </mesh>
        {/* Ground glow ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.85, 24]} />
          <meshStandardMaterial color="#5EEAD4" emissive="#5EEAD4" emissiveIntensity={1.2} transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }
  if (kind === "cone") {
    return (
      <group>
        <mesh position={[0, 0.35, 0]} castShadow>
          <coneGeometry args={[0.32, 0.75, 16]} />
          <meshStandardMaterial color="#FF7A18" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.7, 0.05, 0.7]} />
          <meshStandardMaterial color="#FF7A18" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.24, 0.27, 0.1, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.8, 24]} />
      <meshStandardMaterial color="#3B82F6" transparent opacity={0.75} />
    </mesh>
  );
}

function House({ side, color, index }: { side: -1 | 1; color: string; index: number }) {
  const h = 1.6 + (index % 3) * 0.4;
  return (
    <group position={[side * 5.6, 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, h, 2.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h + 0.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.2, 1.2, 4]} />
        <meshStandardMaterial color="#B45309" />
      </mesh>
      <mesh position={[side * -1.31, 0.55, 0]}>
        <boxGeometry args={[0.05, 1.1, 0.7]} />
        <meshStandardMaterial color="#7C2D12" />
      </mesh>
      <mesh position={[side * -1.31, 1.2, 0.9]}>
        <boxGeometry args={[0.05, 0.6, 0.6]} />
        <meshStandardMaterial color="#BFE7FF" emissive="#FDE68A" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Tree({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 3.9, 0, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1, 8]} />
        <meshStandardMaterial color="#6B4F2A" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.7, 12, 10]} />
        <meshStandardMaterial color="#3FA34D" />
      </mesh>
    </group>
  );
}

function World({ character, color }: { character: CharacterId; color?: string }) {
  const phase = useDeliveryGame((s) => s.phase);
  const wobbling = useDeliveryGame((s) => s.wobbling);
  const riding = phase === "riding";

  const player = useRef<Group>(null);
  const itemRefs = useRef<(Group | null)[]>([]);
  const houseRefs = useRef<(Group | null)[]>([]);
  const treeRefs = useRef<(Group | null)[]>([]);
  const stripeRefs = useRef<(Mesh | null)[]>([]);

  // Object pool: fixed set of meshes per kind, moved around by the simulation.
  const pool = useMemo<PoolItem[]>(
    () => [
      ...Array.from({ length: 7 }, () => ({ kind: "mailbox" as const, lane: 0, z: 0, active: false, done: false })),
      ...Array.from({ length: 4 }, () => ({ kind: "cone" as const, lane: 0, z: 0, active: false, done: false })),
      ...Array.from({ length: 4 }, () => ({ kind: "puddle" as const, lane: 0, z: 0, active: false, done: false })),
    ],
    [],
  );
  const sim = useRef({ spawnIn: 1.2, lastLane: 1, houseZ: 0, treeZ: 0, stripeZ: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = useDeliveryGame.getState();
    const elapsed = s.phase === "riding" ? (Date.now() - s.startedAt) / 1000 : 0;
    const speed = s.phase === "riding" ? speedFor(elapsed, s.difficulty) : 0;

    // Player lane lerp + aspect-aware chase camera (pulls back on portrait phones).
    if (player.current) {
      const targetX = LANE_X[s.lane];
      player.current.position.x = MathUtils.lerp(player.current.position.x, targetX, 1 - Math.pow(0.0005, dt));
      player.current.rotation.z = (targetX - player.current.position.x) * -0.12;

      const cam = state.camera as PerspectiveCamera;
      const aspect = state.size.width / Math.max(1, state.size.height);
      const d = fitDistance(aspect, CAMERA_VFOV, CAMERA_FIT_WIDTH, CAMERA_MIN_DISTANCE);
      if (cam.fov !== CAMERA_VFOV) {
        cam.fov = CAMERA_VFOV;
        cam.updateProjectionMatrix();
      }
      const elev = MathUtils.degToRad(26);
      cam.position.x = MathUtils.lerp(cam.position.x, player.current.position.x * 0.35, 1 - Math.pow(0.01, dt));
      cam.position.y = 0.8 + Math.sin(elev) * d;
      cam.position.z = Math.cos(elev) * d;
      cam.lookAt(player.current.position.x * 0.2, 0.8, -6);
    }

    // Scroll scenery.
    const move = speed * dt;
    houseRefs.current.forEach((g) => {
      if (!g) return;
      g.position.z += move;
      if (g.position.z > 12) g.position.z -= HOUSE_SPACING * HOUSE_COUNT;
    });
    treeRefs.current.forEach((g) => {
      if (!g) return;
      g.position.z += move;
      if (g.position.z > 12) g.position.z -= TREE_SPACING * TREE_COUNT;
    });
    stripeRefs.current.forEach((m) => {
      if (!m) return;
      m.position.z += move;
      if (m.position.z > 8) m.position.z -= 4 * 24;
    });

    if (s.phase !== "riding") return;

    // Spawn.
    sim.current.spawnIn -= dt;
    if (sim.current.spawnIn <= 0) {
      const { kind, lane } = pickSpawn(s.rng, sim.current.lastLane, s.difficulty);
      const slot = pool.find((p) => p.kind === kind && !p.active);
      if (slot) {
        slot.active = true;
        slot.done = false;
        slot.lane = lane;
        slot.z = SPAWN_Z;
        sim.current.lastLane = lane;
      }
      sim.current.spawnIn = spawnIntervalFor(speed, s.difficulty);
    }

    // Advance + collide.
    pool.forEach((p, i) => {
      const g = itemRefs.current[i];
      if (!g) return;
      if (!p.active) {
        g.visible = false;
        return;
      }
      p.z += move;
      g.visible = true;
      g.position.set(LANE_X[p.lane], 0, p.z);
      if (p.kind === "mailbox") g.rotation.y += dt * 1.5;
      if (!p.done && p.lane === s.lane && Math.abs(p.z) < HIT_RADIUS) {
        p.done = true;
        if (p.kind === "mailbox") {
          s.deliver();
          p.active = false;
        } else {
          s.hit();
        }
      }
      if (p.z > DESPAWN_Z) p.active = false;
    });
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <hemisphereLight args={["#BFE7FF", "#3FA34D", 0.5]} />
      <fog attach="fog" args={["#BFE7FF", 25, 70]} />

      {/* Ground, road, sidewalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -30]} receiveShadow>
        <planeGeometry args={[60, 140]} />
        <meshStandardMaterial color="#7CCB6E" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
        <planeGeometry args={[7.2, 140]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} rotation={[-Math.PI / 2, 0, 0]} position={[side * 4.2, 0.005, -30]} receiveShadow>
          <planeGeometry args={[1.2, 140]} />
          <meshStandardMaterial color="#D6D3D1" />
        </mesh>
      ))}
      {/* Lane stripes */}
      {Array.from({ length: 24 }).flatMap((_, i) =>
        [-1.1, 1.1].map((x, j) => (
          <mesh
            key={`${i}-${j}`}
            ref={(el) => {
              stripeRefs.current[i * 2 + j] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.01, -i * 4 + 4]}
          >
            <planeGeometry args={[0.12, 1.6]} />
            <meshStandardMaterial color="#FDE68A" />
          </mesh>
        )),
      )}

      {Array.from({ length: HOUSE_COUNT }).map((_, i) => (
        <group
          key={`h${i}`}
          ref={(el) => {
            houseRefs.current[i] = el;
          }}
          position={[0, 0, 8 - i * HOUSE_SPACING]}
        >
          <House side={-1} color={HOUSE_COLORS[i % HOUSE_COLORS.length]} index={i} />
          <House side={1} color={HOUSE_COLORS[(i + 3) % HOUSE_COLORS.length]} index={i + 1} />
        </group>
      ))}
      {Array.from({ length: TREE_COUNT }).map((_, i) => (
        <group
          key={`t${i}`}
          ref={(el) => {
            treeRefs.current[i] = el;
          }}
          position={[0, 0, 6 - i * TREE_SPACING - 3]}
        >
          <Tree side={i % 2 === 0 ? -1 : 1} />
        </group>
      ))}

      {pool.map((p, i) => (
        <group
          key={`i${i}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          visible={false}
        >
          <ItemMesh kind={p.kind} />
        </group>
      ))}

      <group ref={player} position={[0, 0, 0]}>
        <Bike character={character} color={color} pedaling={riding} wobble={wobbling ? 1 : 0} />
      </group>
    </>
  );
}

export default function DeliveryScene({ character, color }: { character: CharacterId; color?: string }) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 4, 7.2], fov: CAMERA_VFOV }}>
      <color attach="background" args={["#BFE7FF"]} />
      <World character={character} color={color} />
    </Canvas>
  );
}
