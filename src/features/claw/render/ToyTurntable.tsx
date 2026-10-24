"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { MeshKit } from "@/components/three/kit";
import { useSettingsStore } from "@/features/settings/store";
import type { PrizeDef } from "../content/prizes";
import { buildToy } from "./toys";

function Spinning({ prize, spin }: { prize: PrizeDef; spin: boolean }) {
  const kit = useMemo(() => new MeshKit(), []);
  const model = useMemo(() => {
    const g = buildToy(kit, prize);
    // Turntables show every toy at the same size regardless of its catalog radius.
    g.scale.setScalar(1);
    return g;
  }, [kit, prize]);
  useEffect(() => () => kit.dispose(), [kit]);
  const ref = useRef<Group>(null);
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    if (spin) {
      g.rotation.y += dt * 0.9;
      g.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.06;
    } else {
      g.rotation.y = -0.4;
    }
  });
  return (
    <group ref={ref} rotation={[0.1, -0.4, 0]}>
      <primitive object={model} />
    </group>
  );
}

/** A slowly turning 3D preview of a prize for celebrations and the collection. */
export default function ToyTurntable({ prize, size = 180, glow }: { prize: PrizeDef; size?: number | string; glow?: string }) {
  const reduced = useSettingsStore((s) => s.reducedMotion);
  return (
    <div style={{ width: size, height: size, margin: "0 auto" }} aria-hidden>
      <Canvas camera={{ position: [0, 0.5, 3.3], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        <pointLight position={[-3, 2, 2]} intensity={8} color={glow ?? "#FF8AD0"} />
        <Spinning prize={prize} spin={!reduced} />
      </Canvas>
    </div>
  );
}
