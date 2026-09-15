"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Character } from "./Character";
import type { CharacterId } from "@/features/player/types";

function Turntable({ character, active }: { character: CharacterId; active: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * (active ? 1.4 : 0.35);
  });
  return (
    <group ref={ref}>
      <Character character={character} pose="idle" position={[0, -0.9, 0]} />
      <mesh position={[0, -0.95, 0]} receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 32]} />
        <meshStandardMaterial color={active ? "#FDE68A" : "#EADFD0"} />
      </mesh>
    </group>
  );
}

export default function CharacterPreview({
  character,
  active,
}: {
  character: CharacterId;
  active: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.4, 4.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} castShadow />
      <Suspense fallback={null}>
        <Turntable character={character} active={active} />
      </Suspense>
    </Canvas>
  );
}
