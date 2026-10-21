"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { Particles } from "@/components/three/particles";
import { isFrozen, shakeOffset, useJuice } from "@/lib/fx";
import { useSettingsStore } from "@/features/settings/store";
import { BAKE } from "../config";
import type { KitchenEngine } from "../engine/KitchenEngine";
import Chefs, { type ChefLook } from "./Chefs";
import Stations from "./Stations";
import { floorTexture } from "./textures";
import { COUNTER_H, setProjector, worldX, worldZ } from "./view";

export interface SceneInsets {
  /** Share of the viewport covered by HUD at the top / bottom (0..0.5). */
  top: number;
  bottom: number;
  /**
   * Phone landscape: size the counters to the screen and let the tickets,
   * stick and buttons cover the edges. The decorative back wall may clip.
   */
  fill?: boolean;
}

const FOV = 38;
const ELEVATION_WIDE = MathUtils.degToRad(56);
const ELEVATION_TALL = MathUtils.degToRad(72);

/** Re-render counter bumped by any engine event (items moved, orders changed). */
function useEngineVersion(engine: KitchenEngine): number {
  const [v, setV] = useState(0);
  useEffect(() => engine.events.on(() => setV((x) => x + 1)), [engine]);
  return v;
}

function EngineDriver({ engine }: { engine: KitchenEngine }) {
  useFrame((_, dt) => {
    if (!isFrozen()) engine.advance(dt);
  });
  return null;
}

/**
 * Tilted toy-box camera. Desktop keeps the whole kitchen between the HUD bars.
 * A landscape phone fills the screen with the counters; the tickets, stick and
 * buttons float on the edges, and the back wall may run off the top.
 * Tall viewports look down more steeply so the counters stay big.
 */
function CameraRig({ engine, insets }: { engine: KitchenEngine; insets: SceneInsets }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const home = useRef(new Vector3());
  const { width, depth } = engine.state;

  useEffect(() => {
    // Read the camera inside the effect: it's a mutable three.js object owned by R3F.
    const camera = get().camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const t = MathUtils.clamp((1.3 - aspect) / (1.3 - 0.6), 0, 1);
    const elevation = MathUtils.lerp(ELEVATION_WIDE, ELEVATION_TALL, t);
    const fill = insets.fill === true;
    camera.fov = FOV;
    camera.aspect = aspect;
    const shift = ((insets.bottom - insets.top) * size.height) / 2;
    camera.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    camera.updateProjectionMatrix();

    const center = new Vector3(0, COUNTER_H * 0.5, 0.15);
    const dir = new Vector3(0, Math.sin(elevation), Math.cos(elevation));
    const corners: Vector3[] = [];
    const xPad = fill ? 0.05 : 0.1;
    const zBack = fill ? 0 : 0.2;
    const zFront = fill ? 0 : 0.1;
    for (const x of [-width / 2 - xPad, width / 2 + xPad]) {
      for (const z of [-depth / 2 - zBack, depth / 2 + zFront]) {
        // Phone framing fits the counters, not the tall back wall, so the floor can fill a short screen.
        const extra = fill ? (z < 0 ? 0.15 : 0.1) : z < 0 ? 1.1 : 0.4;
        corners.push(new Vector3(x, 0, z), new Vector3(x, COUNTER_H + extra, z));
      }
    }
    const pad = fill ? 0.01 : 0.03;
    const margin = fill ? 0.99 : 0.97;
    // A little of the front lip may sit under the stick and grab button.
    const lo = -1 + 2 * insets.bottom + pad - (fill ? 0.04 : 0);
    const hi = 1 - 2 * insets.top - pad;
    const p = new Vector3();
    const fits = (d: number) => {
      camera.position.copy(center).addScaledVector(dir, d);
      camera.lookAt(center);
      camera.updateMatrixWorld();
      return corners.every((c) => {
        p.copy(c).project(camera);
        return Math.abs(p.x) <= margin && p.y >= lo && p.y <= hi && p.z < 1;
      });
    };
    let a = 3;
    let b = 80;
    for (let i = 0; i < 30; i++) {
      const mid = (a + b) / 2;
      if (fits(mid)) b = mid;
      else a = mid;
    }
    fits(b);
    home.current.copy(camera.position);
    return () => camera.clearViewOffset();
  }, [get, size.width, size.height, insets.top, insets.bottom, insets.fill, width, depth]);

  useEffect(() => {
    const v = new Vector3();
    setProjector(
      (x, y, z) => {
        v.set(x, y, z).project(get().camera);
        return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
      },
      { width, depth },
    );
    return () => setProjector(null);
  }, [get, width, depth]);

  useFrame((state, dt) => {
    useJuice.getState().decayShake(dt);
    const [sx, sy] = shakeOffset();
    state.camera.position.set(home.current.x + sx, home.current.y + sy, home.current.z);
  });
  return null;
}

function Room({ engine }: { engine: KitchenEngine }) {
  const { width, depth } = engine.state;
  const floor = useMemo(() => floorTexture(width, depth), [width, depth]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1E2738" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* Back wall with a tiled stripe and windows onto the street */}
      <group position={[0, 0, -depth / 2 - 0.06]}>
        <mesh position={[0, 1.1, 0]} receiveShadow>
          <boxGeometry args={[width + 0.4, 2.2, 0.12]} />
          <meshStandardMaterial color="#FFF4E0" />
        </mesh>
        <mesh position={[0, 0.95, 0.07]}>
          <boxGeometry args={[width + 0.4, 0.2, 0.02]} />
          <meshStandardMaterial color="#2F80C8" />
        </mesh>
        {[-width / 2 + 2.2, width / 2 - 2.2].map((x) => (
          <mesh key={x} position={[x, 1.6, 0.07]}>
            <boxGeometry args={[1.4, 0.6, 0.02]} />
            <meshStandardMaterial color="#BFE7FF" emissive="#BFE7FF" emissiveIntensity={0.4} />
          </mesh>
        ))}
        {/* Striped awning over the menu board */}
        <mesh position={[0, 1.65, 0.08]}>
          <boxGeometry args={[2.2, 0.7, 0.02]} />
          <meshStandardMaterial color="#2B2D42" />
        </mesh>
        {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
          <mesh key={x} position={[x, 2.08, 0.16]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.35, 0.04, 0.3]} />
            <meshStandardMaterial color={i % 2 ? "#FFFFFF" : "#F2542D"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Pooled particles driven by engine events (sparkles on a good serve, smoke from burnt pizza). */
function Effects({ engine }: { engine: KitchenEngine }) {
  const particles = useMemo(() => new Particles(), []);
  const smokeClock = useRef(0);
  useEffect(() => () => particles.dispose(), [particles]);
  useEffect(() => {
    const at = (station: number): [number, number] => {
      const st = engine.state.stations[station];
      return st ? [worldX(engine.state, st.tx + 0.5), worldZ(engine.state, st.tz + 0.5)] : [0, 0];
    };
    return engine.events.on((e) => {
      if (useSettingsStore.getState().reducedMotion && e.type !== "served") return;
      switch (e.type) {
        case "served": {
          const [x, z] = at(e.station);
          if (e.result.correct) particles.sparkle(x, z);
          else particles.smoke(x, COUNTER_H + 0.2, z);
          break;
        }
        case "workDone": {
          const [x, z] = at(e.station);
          if (e.wanted) particles.dust(x, z);
          break;
        }
        case "dash": {
          const c = engine.state.chefs[e.chef];
          if (c) particles.dust(worldX(engine.state, c.x), worldZ(engine.state, c.z));
          break;
        }
        case "reset":
          particles.clear();
          break;
      }
    });
  }, [engine, particles]);
  useFrame((_, dt) => {
    particles.update(dt);
    smokeClock.current += dt;
    if (smokeClock.current < 0.3) return;
    smokeClock.current = 0;
    const s = engine.state;
    if (s.phase !== "playing") return;
    for (const st of s.stations) {
      if (st.kind !== "oven" || st.item?.kind !== "pizza") continue;
      if (st.item.bake >= BAKE.warning) particles.smoke(worldX(s, st.tx + 0.5), COUNTER_H + 0.3, worldZ(s, st.tz + 0.5));
    }
  });
  return <primitive object={particles.mesh} />;
}

function Lights({ engine }: { engine: KitchenEngine }) {
  const { width, depth } = engine.state;
  return (
    <>
      <hemisphereLight args={["#FFFFFF", "#6B5B4A", 1.6]} />
      <directionalLight
        position={[-4, 10, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-width / 2 - 1}
        shadow-camera-right={width / 2 + 1}
        shadow-camera-top={depth / 2 + 2}
        shadow-camera-bottom={-depth / 2 - 2}
        shadow-bias={-0.0006}
      />
    </>
  );
}

function World({ engine, looks, insets }: { engine: KitchenEngine; looks: ChefLook[]; insets: SceneInsets }) {
  const version = useEngineVersion(engine);
  return (
    <>
      <EngineDriver engine={engine} />
      <CameraRig engine={engine} insets={insets} />
      <Lights engine={engine} />
      <Room engine={engine} />
      <Stations engine={engine} version={version} />
      <Chefs engine={engine} looks={looks} version={version} />
      <Effects engine={engine} />
    </>
  );
}

export default function KitchenScene({ engine, looks, insets }: { engine: KitchenEngine; looks: ChefLook[]; insets: SceneInsets }) {
  // Phones are often 3x. Cap at 2 so the filled view stays sharp without a full-screen 3x shadow pass.
  const dpr: [number, number] = insets.fill ? [1, 2] : [1, 1.75];
  return (
    <Canvas shadows="percentage" dpr={dpr} camera={{ fov: FOV, near: 0.5, far: 120 }} gl={{ antialias: true }}>
      <color attach="background" args={["#141B28"]} />
      <World engine={engine} looks={looks} insets={insets} />
    </Canvas>
  );
}
