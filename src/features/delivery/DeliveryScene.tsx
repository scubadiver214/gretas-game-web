"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, MathUtils, Shape, type Group, type Mesh, type MeshStandardMaterial, type PerspectiveCamera } from "three";
import { fitDistance } from "@/components/three/FitCamera";
import { C } from "@/design/tokens";
import { Character } from "@/features/characters/Character";
import { BIKE_SKIN_BY_ID, type BikeSkinId, type CharacterId } from "@/features/player/types";
import { isFrozen, shakeOffset, useJuice } from "@/lib/fx";
import { CLEAR_HEIGHT, LANE_X, jumpHeight, pickSpawn, spawnIntervalFor, speedFor, type ItemKind, type PowerUpKind } from "./scoring";
import { isMagnet, isTurbo, useDeliveryGame } from "./useDeliveryGame";

const CAMERA_VFOV = 55;
const CAMERA_FIT_WIDTH = 7.2; // both outer lanes + a mailbox on each side
const CAMERA_MIN_DISTANCE = 7.2;
const SPAWN_Z = -70;
const DESPAWN_Z = 6;
const HIT_RADIUS = 1.0;
const MAGNET_RANGE = 7;
const HOUSE_SPACING = 9;
const HOUSE_COUNT = 10;
const TREE_SPACING = 6;
const TREE_COUNT = 14;
const LAMP_SPACING = 18;
const LAMP_COUNT = 5;
const CLOUD_COUNT = 7;
const PARTICLE_COUNT = 48;

interface PoolItem {
  kind: ItemKind;
  lane: number;
  /** Visual x; lerps toward the lane (magnet pulls mailboxes across). */
  x: number;
  z: number;
  active: boolean;
  done: boolean;
  powerUp?: PowerUpKind;
}

interface Particle {
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: Color;
  size: number;
}

// Flat toy-town palette: mostly white and blue with a few warm accents.
const HOUSE_COLORS = ["#FFFFFF", "#9FD2FF", "#FFE6A8", "#BFF0BA", "#FFC9A8", "#D8D2FF"];
const ROOF_COLORS = [C.blueDeep, "#1E3A8A", C.tomatoDeep, C.crustDeep];
const CAR_COLORS = [C.grass, C.blue, C.tomato, C.sun];

const STAR_SHAPE = (() => {
  const s = new Shape();
  const outer = 0.42;
  const inner = 0.18;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
})();

// ---------------------------------------------------------------------------
// The bike + rider
// ---------------------------------------------------------------------------

function Wheel({ position, spin }: { position: [number, number, number]; spin: React.RefObject<Mesh | null> }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh ref={spin} castShadow>
        <torusGeometry args={[0.32, 0.06, 10, 24]} />
        <meshStandardMaterial color="#1F2937" />
        {/* Spokes spin with the tyre */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <boxGeometry args={[0.6, 0.02, 0.02]} />
            <meshStandardMaterial color="#9CA3AF" />
          </mesh>
        ))}
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
        <meshStandardMaterial color="#9CA3AF" />
      </mesh>
    </group>
  );
}

function Bike({
  character,
  color,
  skin,
  pedaling,
  wobble,
}: {
  character: CharacterId;
  color?: string;
  skin: BikeSkinId;
  pedaling: boolean;
  wobble: number;
}) {
  const front = useRef<Mesh>(null);
  const back = useRef<Mesh>(null);
  const paint = BIKE_SKIN_BY_ID[skin];
  useFrame((_, delta) => {
    const spin = pedaling ? delta * 9 : 0;
    if (front.current) front.current.rotation.z -= spin;
    if (back.current) back.current.rotation.z -= spin;
  });
  return (
    <group>
      <Wheel position={[0, 0.34, 0.55]} spin={back} />
      <Wheel position={[0, 0.34, -0.6]} spin={front} />
      {/* Fenders */}
      <mesh position={[0, 0.36, 0.55]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.4, 0.035, 8, 16, Math.PI]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      <mesh position={[0, 0.36, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.4, 0.035, 8, 16, Math.PI]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0.62, 0]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 1.1]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      <mesh position={[0, 0.5, 0.3]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.7]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      <mesh position={[0, 0.7, 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      <mesh position={[0, 0.85, -0.5]} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color={paint.frame} />
      </mesh>
      {/* Chain ring + pedals */}
      <mesh position={[0, 0.42, 0.05]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.03, 16]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
      {/* Handlebar + grips + seat */}
      <mesh position={[0, 1.1, -0.5]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 1.1, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
          <meshStandardMaterial color={paint.accent} />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0.45]}>
        <boxGeometry args={[0.22, 0.06, 0.3]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      {/* Bell */}
      <mesh position={[0.18, 1.15, -0.48]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color="#F2B134" metalness={0.6} roughness={0.3} />
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
      <mesh position={[0, 1.285, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
      <Character character={character} color={color} pose="bike" pedaling={pedaling} wobble={wobble} position={[0, 0.72, 0.28]} rotation={[0, Math.PI, 0]} scale={0.85} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

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
        <mesh position={[0, 1.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.7, 12, 1, false, 0, Math.PI]} />
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
  if (kind === "barrier") {
    return (
      <group>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 0.35, 0]} castShadow>
            <boxGeometry args={[0.1, 0.7, 0.4]} />
            <meshStandardMaterial color="#6B4F2A" />
          </mesh>
        ))}
        {/* Striped plank */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[-0.75 + i * 0.3 + 0.15, 0.6, 0]} castShadow>
            <boxGeometry args={[0.3, 0.22, 0.08]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#F2542D" : "#FFFFFF"} />
          </mesh>
        ))}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.8, 0.08, 0.06]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>
    );
  }
  if (kind === "star") {
    return (
      <group position={[0, 1.1, 0]}>
        <mesh castShadow>
          <extrudeGeometry args={[STAR_SHAPE, { depth: 0.12, bevelEnabled: false }]} />
          <meshStandardMaterial color="#FDE68A" emissive="#F2B134" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, -1.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.65, 24]} />
          <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={1.2} transparent opacity={0.7} />
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

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

function Awning({ width, y, z, colors }: { width: number; y: number; z: number; colors: [string, string] }) {
  const stripes = Math.max(3, Math.round(width / 0.4));
  const w = width / stripes;
  return (
    <group position={[0, y, z]} rotation={[0.35, 0, 0]}>
      {Array.from({ length: stripes }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + w / 2 + i * w, 0, 0]} castShadow>
          <boxGeometry args={[w, 0.06, 0.9]} />
          <meshStandardMaterial color={i % 2 === 0 ? colors[0] : colors[1]} />
        </mesh>
      ))}
      {/* Scalloped edge */}
      {Array.from({ length: stripes }).map((_, i) => (
        <mesh key={`s${i}`} position={[-width / 2 + w / 2 + i * w, -0.05, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w / 2, w / 2, 0.05, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={i % 2 === 0 ? colors[0] : colors[1]} />
        </mesh>
      ))}
    </group>
  );
}

function Pizzeria({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 5.9, 0, 0]} rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}>
      {/* Building */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.6, 3]} />
        <meshStandardMaterial color="#FFF1D6" />
      </mesh>
      {/* Brick base */}
      <mesh position={[0, 0.3, 0.02]}>
        <boxGeometry args={[3.44, 0.6, 3.04]} />
        <meshStandardMaterial color="#C0392B" />
      </mesh>
      {/* Big shop window + door (facing the road, +z in local space) */}
      <mesh position={[-0.7, 1.25, 1.52]}>
        <boxGeometry args={[1.4, 1.1, 0.05]} />
        <meshStandardMaterial color="#BFE7FF" emissive="#FDE68A" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[1.0, 0.95, 1.52]}>
        <boxGeometry args={[0.7, 1.3, 0.05]} />
        <meshStandardMaterial color="#3FA34D" />
      </mesh>
      <Awning width={3.2} y={2.05} z={1.75} colors={["#F2542D", "#FFFFFF"]} />
      {/* Roof + sign */}
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[3.6, 0.2, 3.2]} />
        <meshStandardMaterial color="#3FA34D" />
      </mesh>
      <mesh position={[0, 3.25, 1.2]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.4, 0.7, 0.15]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 3.25, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 20]} />
        <meshStandardMaterial color="#F2B134" />
      </mesh>
      <mesh position={[0, 3.25, 1.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 20]} />
        <meshStandardMaterial color="#C8342A" />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 3.25, 1.3]}>
          <boxGeometry args={[0.5, 0.18, 0.05]} />
          <meshStandardMaterial color="#F2542D" />
        </mesh>
      ))}
      {/* Pizza boxes stacked by the door */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.55, 0.08 + i * 0.16, 1.9]} rotation={[0, i * 0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.12, 0.5]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}

function House({ side, color, roof, index }: { side: -1 | 1; color: string; roof: string; index: number }) {
  const h = 1.6 + (index % 3) * 0.4;
  return (
    <group position={[side * 5.6, 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, h, 2.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h + 0.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.2, 1.2, 4]} />
        <meshStandardMaterial color={roof} />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.7, h + 0.8, -0.6]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshStandardMaterial color="#7C2D12" />
      </mesh>
      {/* Door */}
      <mesh position={[side * -1.31, 0.55, 0.3]}>
        <boxGeometry args={[0.05, 1.1, 0.7]} />
        <meshStandardMaterial color="#7C2D12" />
      </mesh>
      <mesh position={[side * -1.34, 0.55, 0.05]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#F2B134" />
      </mesh>
      {/* Windows */}
      {[-0.8, 0.9].map((z) => (
        <group key={z}>
          <mesh position={[side * -1.31, 1.15, z]}>
            <boxGeometry args={[0.05, 0.6, 0.6]} />
            <meshStandardMaterial color="#BFE7FF" emissive="#FDE68A" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[side * -1.33, 1.15, z]}>
            <boxGeometry args={[0.03, 0.66, 0.06]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[side * -1.33, 1.15, z]}>
            <boxGeometry args={[0.03, 0.06, 0.66]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
      {/* Small striped awning over the door on some houses */}
      {index % 2 === 0 && (
        <group position={[side * -1.4, 1.25, 0.3]} rotation={[0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <Awning width={1.0} y={0} z={0.1} colors={index % 4 === 0 ? ["#3FA34D", "#FFFFFF"] : ["#3B82F6", "#FFFFFF"]} />
        </group>
      )}
      {/* Hedge along the front */}
      <mesh position={[side * -1.0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.4, 0.5, 2.4]} />
        <meshStandardMaterial color="#3FA34D" />
      </mesh>
    </group>
  );
}

function Car({ side, color }: { side: -1 | 1; color: string }) {
  return (
    <group position={[side * 4.4, 0, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 1.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.85, -0.1]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.0]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.85, -0.1]}>
        <boxGeometry args={[0.84, 0.28, 0.9]} />
        <meshStandardMaterial color="#BFE7FF" />
      </mesh>
      {/* Pizza sign on the roof */}
      <mesh position={[0, 1.2, -0.1]}>
        <boxGeometry args={[0.5, 0.3, 0.1]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 1.2, -0.04]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial color="#F2542D" />
      </mesh>
      {[-0.6, 0.6].map((z) =>
        [-0.45, 0.45].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.22, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
            <meshStandardMaterial color="#1F2937" />
          </mesh>
        )),
      )}
    </group>
  );
}

function Tree({ side, variant }: { side: -1 | 1; variant: number }) {
  if (variant % 3 === 2) {
    // Bush cluster
    return (
      <group position={[side * 3.9, 0, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshStandardMaterial color="#3FA34D" />
        </mesh>
        <mesh position={[0.4, 0.28, 0.2]} castShadow>
          <sphereGeometry args={[0.3, 10, 8]} />
          <meshStandardMaterial color="#5EBE5E" />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.2 + i * 0.25, 0.7, 0.1 - i * 0.1]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color={["#E85D9A", "#F2B134", "#FFFFFF"][i]} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group position={[side * 3.9, 0, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1, 8]} />
        <meshStandardMaterial color="#6B4F2A" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.7, 12, 10]} />
        <meshStandardMaterial color={variant % 3 === 0 ? "#3FA34D" : "#2F8F3E"} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color="#5EBE5E" />
      </mesh>
    </group>
  );
}

function Lamp({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 4.6, 0, 0]}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 2.8, 8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[side * -0.3, 2.8, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[side * -0.6, 2.72, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Cloud({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[1, -0.1, 0]}>
        <sphereGeometry args={[0.75, 10, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.95, -0.15, 0.1]}>
        <sphereGeometry args={[0.7, 10, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.3, 0.5, -0.2]}>
        <sphereGeometry args={[0.65, 10, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

function World({ character, color, bikeSkin }: { character: CharacterId; color?: string; bikeSkin: BikeSkinId }) {
  const phase = useDeliveryGame((s) => s.phase);
  const wobbling = useDeliveryGame((s) => s.wobbling);
  const shield = useDeliveryGame((s) => s.shield);
  const powerUp = useDeliveryGame((s) => s.powerUp);
  const riding = phase === "riding";

  const player = useRef<Group>(null);
  const bikeBody = useRef<Group>(null);
  const shieldMat = useRef<MeshStandardMaterial>(null);
  const magnetRing = useRef<Mesh>(null);
  const itemRefs = useRef<(Group | null)[]>([]);
  const houseRefs = useRef<(Group | null)[]>([]);
  const treeRefs = useRef<(Group | null)[]>([]);
  const lampRefs = useRef<(Group | null)[]>([]);
  const cloudRefs = useRef<(Group | null)[]>([]);
  const stripeRefs = useRef<(Mesh | null)[]>([]);
  const particleRefs = useRef<(Mesh | null)[]>([]);

  // Object pool: fixed set of meshes per kind, moved around by the simulation.
  const pool = useMemo<PoolItem[]>(() => {
    const mk = (kind: ItemKind, n: number) => Array.from({ length: n }, () => ({ kind, lane: 0, x: 0, z: 0, active: false, done: false }));
    return [...mk("mailbox", 7), ...mk("cone", 4), ...mk("puddle", 4), ...mk("barrier", 3), ...mk("star", 2)];
  }, []);
  // Particles live in a ref: they are mutated every frame and never drive React renders.
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, color: new Color("#fff"), size: 0.1 })),
  );
  const sim = useRef({ spawnIn: 1.2, lastLane: 1, wasAirborne: false, landedAt: 0, lastLaneChange: 0, lastDeliveries: 0, lastHits: 0, lastPowerUps: 0 });

  const emit = (x: number, y: number, z: number, colors: string[], count: number, speed = 3) => {
    let n = 0;
    for (const p of particles.current) {
      if (n >= count) break;
      if (p.life > 0) continue;
      p.life = 0.5 + Math.random() * 0.35;
      p.x = x;
      p.y = y;
      p.z = z;
      const a = Math.random() * Math.PI * 2;
      const r = speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(a) * r;
      p.vz = Math.sin(a) * r * 0.6;
      p.vy = 2 + Math.random() * speed;
      p.color.set(colors[Math.floor(Math.random() * colors.length)]);
      p.size = 0.035 + Math.random() * 0.05;
      n++;
    }
  };

  useFrame((state, delta) => {
    const rawDt = Math.min(delta, 0.05);
    const frozen = isFrozen();
    const dt = frozen ? 0 : rawDt;
    const s = useDeliveryGame.getState();
    const now = Date.now();
    const elapsed = s.phase === "riding" ? (now - s.startedAt) / 1000 : 0;
    const turbo = isTurbo(s);
    const magnet = isMagnet(s);
    const speed = s.phase === "riding" ? speedFor(elapsed, s.difficulty, turbo) : 0;
    const juice = useJuice.getState();
    juice.decayShake(rawDt);

    // Jump arc.
    const jumpT = s.jumpStartedAt ? (now - s.jumpStartedAt) / 1000 : -1;
    const height = jumpHeight(jumpT);
    const airborne = height > CLEAR_HEIGHT;
    if (sim.current.wasAirborne && height === 0) {
      sim.current.landedAt = now;
      if (player.current) emit(player.current.position.x, 0.05, 0.3, ["#D6D3D1", "#FFFFFF"], 8, 1.5);
    }
    sim.current.wasAirborne = height > 0;

    // Fire particle bursts when the store counters change.
    if (player.current) {
      const px = player.current.position.x;
      if (s.deliveries !== sim.current.lastDeliveries) {
        emit(px, 1.2, 0, ["#5EEAD4", "#FDE68A", "#FFFFFF", "#F2542D"], s.combo % 3 === 0 ? 22 : 12, 3.5);
        sim.current.lastDeliveries = s.deliveries;
      }
      if (s.hits !== sim.current.lastHits) {
        emit(px, 0.4, 0, ["#3B82F6", "#93C5FD", "#FF7A18"], 14, 3);
        sim.current.lastHits = s.hits;
      }
      if (s.powerUpsCollected !== sim.current.lastPowerUps) {
        emit(px, 1.3, 0, ["#FDE68A", "#F2B134", "#FFFFFF"], 24, 4);
        sim.current.lastPowerUps = s.powerUpsCollected;
      }
    }

    // Player lane lerp, jump, squash/stretch + aspect-aware chase camera.
    if (player.current) {
      const targetX = LANE_X[s.lane];
      player.current.position.x = MathUtils.lerp(player.current.position.x, targetX, 1 - Math.pow(0.0005, rawDt));
      player.current.position.y = height;
      player.current.rotation.z = (targetX - player.current.position.x) * -0.12;
      player.current.rotation.x = jumpT >= 0 && height > 0 ? -(0.5 - jumpT / 0.7) * 0.5 : 0;

      if (bikeBody.current) {
        const sinceLane = (now - s.laneChangedAt) / 1000;
        const sinceLand = (now - sim.current.landedAt) / 1000;
        const kLane = Math.max(0, 1 - sinceLane / 0.22);
        const kLand = Math.max(0, 1 - sinceLand / 0.2);
        const stretch = jumpT >= 0 && height > 0 ? 0.08 : 0;
        bikeBody.current.scale.set(1 + 0.16 * kLane + 0.14 * kLand - stretch * 0.5, 1 - 0.12 * kLane - 0.14 * kLand + stretch, 1);
      }

      const cam = state.camera as PerspectiveCamera;
      const aspect = state.size.width / Math.max(1, state.size.height);
      const d = fitDistance(aspect, CAMERA_VFOV, CAMERA_FIT_WIDTH, CAMERA_MIN_DISTANCE);
      const wantFov = turbo ? CAMERA_VFOV + 7 : CAMERA_VFOV;
      if (Math.abs(cam.fov - wantFov) > 0.05) {
        cam.fov = MathUtils.lerp(cam.fov, wantFov, 1 - Math.pow(0.01, rawDt));
        cam.updateProjectionMatrix();
      }
      const elev = MathUtils.degToRad(26);
      const [sx, sy] = shakeOffset();
      cam.position.x = MathUtils.lerp(cam.position.x, player.current.position.x * 0.35, 1 - Math.pow(0.01, rawDt)) + sx;
      cam.position.y = 0.8 + Math.sin(elev) * d + sy;
      cam.position.z = Math.cos(elev) * d;
      cam.lookAt(player.current.position.x * 0.2 + sx * 0.5, 0.8 + sy * 0.5, -6);
    }

    // Shield / magnet visuals.
    if (shieldMat.current) {
      const want = shield ? 0.35 + Math.sin(state.clock.elapsedTime * 6) * 0.08 : 0;
      shieldMat.current.opacity = MathUtils.lerp(shieldMat.current.opacity, want, 0.2);
    }
    if (magnetRing.current) {
      magnetRing.current.visible = magnet;
      magnetRing.current.rotation.z += rawDt * 2;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.08;
      magnetRing.current.scale.setScalar(pulse);
    }

    // Scroll scenery.
    const move = speed * dt;
    const recycle = (refs: (Group | Mesh | null)[], span: number, limit: number) => {
      refs.forEach((g) => {
        if (!g) return;
        g.position.z += move;
        if (g.position.z > limit) g.position.z -= span;
      });
    };
    recycle(houseRefs.current, HOUSE_SPACING * HOUSE_COUNT, 12);
    recycle(treeRefs.current, TREE_SPACING * TREE_COUNT, 12);
    recycle(lampRefs.current, LAMP_SPACING * LAMP_COUNT, 12);
    recycle(stripeRefs.current, 4 * 24, 8);
    cloudRefs.current.forEach((g, i) => {
      if (!g) return;
      g.position.x += rawDt * (0.15 + (i % 3) * 0.08);
      if (g.position.x > 30) g.position.x = -30;
    });

    // Particles.
    particles.current.forEach((p, i) => {
      const m = particleRefs.current[i];
      if (!m) return;
      if (p.life <= 0) {
        m.visible = false;
        return;
      }
      p.life -= rawDt;
      p.vy -= 9 * rawDt;
      p.x += p.vx * rawDt;
      p.y += p.vy * rawDt;
      p.z += p.vz * rawDt + move;
      if (p.y < 0.02) {
        p.y = 0.02;
        p.vy *= -0.3;
      }
      m.visible = true;
      m.position.set(p.x, p.y, p.z);
      const k = Math.min(1, p.life / 0.3);
      m.scale.setScalar(p.size * k);
      (m.material as MeshStandardMaterial).color.copy(p.color);
    });

    if (s.phase !== "riding") return;

    // Spawn.
    sim.current.spawnIn -= dt;
    if (sim.current.spawnIn <= 0) {
      const spawn = pickSpawn(s.rng, sim.current.lastLane, s.difficulty);
      const slot = pool.find((p) => p.kind === spawn.kind && !p.active);
      if (slot) {
        slot.active = true;
        slot.done = false;
        slot.lane = spawn.lane;
        slot.x = LANE_X[spawn.lane];
        slot.z = SPAWN_Z;
        slot.powerUp = spawn.powerUp;
        sim.current.lastLane = spawn.lane;
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
      // Magnet: pull nearby mailboxes into the player's lane.
      if (magnet && p.kind === "mailbox" && !p.done && p.z > -MAGNET_RANGE && p.lane !== s.lane) p.lane = s.lane;
      p.x = MathUtils.lerp(p.x, LANE_X[p.lane], 1 - Math.pow(0.001, rawDt));
      g.visible = true;
      g.position.set(p.x, 0, p.z);
      if (p.kind === "mailbox") g.rotation.y += rawDt * 1.5;
      if (p.kind === "star") {
        g.rotation.y += rawDt * 3;
        g.position.y = Math.sin(state.clock.elapsedTime * 4 + i) * 0.12;
      }
      if (!p.done && p.lane === s.lane && Math.abs(p.z) < HIT_RADIUS) {
        if (p.kind === "star") {
          p.done = true;
          p.active = false;
          if (p.powerUp) s.collectPowerUp(p.powerUp);
        } else if (p.kind === "mailbox") {
          if (!airborne) {
            p.done = true;
            p.active = false;
            s.deliver();
          }
        } else if (airborne) {
          // Cleared it in the air.
          p.done = true;
        } else {
          p.done = true;
          s.hit(p.kind);
        }
      }
      if (p.z > DESPAWN_Z) p.active = false;
    });
  });

  const bikeColor = BIKE_SKIN_BY_ID[bikeSkin];

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 4]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <hemisphereLight args={[C.blueSoft, C.grass, 0.3]} />
      <fog attach="fog" args={[C.blueSoft, 40, 80]} />

      {/* Sun + clouds */}
      <mesh position={[-14, 16, -60]}>
        <sphereGeometry args={[3.2, 20, 16]} />
        <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={1.5} fog={false} />
      </mesh>
      {Array.from({ length: CLOUD_COUNT }).map((_, i) => (
        <group
          key={`c${i}`}
          ref={(el) => {
            cloudRefs.current[i] = el;
          }}
          position={[-26 + i * 8.5, 9 + (i % 3) * 2.2, -45 - (i % 4) * 6]}
        >
          <Cloud position={[0, 0, 0]} scale={1.4 + (i % 3) * 0.5} />
        </group>
      ))}

      {/* Ground, road, sidewalks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -30]} receiveShadow>
        <planeGeometry args={[60, 140]} />
        <meshStandardMaterial color={C.grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
        <planeGeometry args={[7.2, 140]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Sand pavement with the blue kerb the whole town is trimmed in */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[side * 4.4, 0.005, -30]} receiveShadow>
            <planeGeometry args={[1.6, 140]} />
            <meshStandardMaterial color={C.sand} />
          </mesh>
          <mesh position={[side * 3.66, 0.06, -30]}>
            <boxGeometry args={[0.14, 0.12, 140]} />
            <meshStandardMaterial color={C.blue} />
          </mesh>
          <mesh position={[side * 5.22, 0.06, -30]}>
            <boxGeometry args={[0.14, 0.12, 140]} />
            <meshStandardMaterial color={C.blue} />
          </mesh>
        </group>
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
          {i % 5 === 2 ? <Pizzeria side={-1} /> : <House side={-1} color={HOUSE_COLORS[i % HOUSE_COLORS.length]} roof={ROOF_COLORS[i % ROOF_COLORS.length]} index={i} />}
          {i % 5 === 4 ? <Pizzeria side={1} /> : <House side={1} color={HOUSE_COLORS[(i + 3) % HOUSE_COLORS.length]} roof={ROOF_COLORS[(i + 2) % ROOF_COLORS.length]} index={i + 1} />}
          {i % 3 === 1 && <Car side={i % 2 === 0 ? -1 : 1} color={CAR_COLORS[i % CAR_COLORS.length]} />}
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
          <Tree side={i % 2 === 0 ? -1 : 1} variant={i} />
        </group>
      ))}
      {Array.from({ length: LAMP_COUNT }).map((_, i) => (
        <group
          key={`l${i}`}
          ref={(el) => {
            lampRefs.current[i] = el;
          }}
          position={[0, 0, 2 - i * LAMP_SPACING]}
        >
          <Lamp side={i % 2 === 0 ? 1 : -1} />
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

      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={`p${i}`}
          ref={(el) => {
            particleRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.4} />
        </mesh>
      ))}

      <group ref={player} position={[0, 0, 0]}>
        <group ref={bikeBody}>
          <Bike character={character} color={color} skin={bikeSkin} pedaling={riding} wobble={wobbling ? 1 : 0} />
        </group>
        {/* Shield bubble */}
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[1.25, 20, 16]} />
          <meshStandardMaterial ref={shieldMat} color="#93C5FD" emissive="#3B82F6" emissiveIntensity={0.6} transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* Magnet ring */}
        <mesh ref={magnetRing} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[1.0, 1.25, 32]} />
          <meshStandardMaterial color="#C4B5FD" emissive="#7C3AED" emissiveIntensity={1} transparent opacity={0.7} />
        </mesh>
        {/* Turbo trail */}
        {powerUp?.kind === "turbo" && (
          <mesh position={[0, 0.4, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.35, 1.6, 10, 1, true]} />
            <meshStandardMaterial color={bikeColor.accent} emissive="#F2B134" emissiveIntensity={1.2} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )}
      </group>
    </>
  );
}

export default function DeliveryScene({ character, color, bikeSkin = "classic" }: { character: CharacterId; color?: string; bikeSkin?: BikeSkinId }) {
  return (
    <Canvas shadows="percentage" dpr={[1, 1.75]} camera={{ position: [0, 4, 7.2], fov: CAMERA_VFOV }}>
      <color attach="background" args={[C.blueSoft]} />
      <World character={character} color={color} bikeSkin={bikeSkin} />
    </Canvas>
  );
}
