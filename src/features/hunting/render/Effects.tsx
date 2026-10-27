"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import type { HuntEngine } from "../engine/HuntEngine";
import { EffectsSystem } from "./systems/effects";

export function Effects({ engine, reducedMotion }: { engine: HuntEngine; reducedMotion: () => boolean }) {
  const system = useMemo(() => new EffectsSystem(), []);
  useEffect(() => () => system.dispose(), [system]);
  useEffect(
    () =>
      engine.events.on((e) => {
        if (e.type === "hit") system.enqueue("hit", e.pos);
        else if (e.type === "multi") system.enqueue("multi", e.pos);
        else if (e.type === "takeoff") system.enqueue("bigSplash", e.pos);
        else if (e.type === "splash") system.enqueue(e.big ? "bigSplash" : "splash", e.pos);
      }),
    [engine, system],
  );
  useFrame((state, dt) => system.update(dt, state.camera as PerspectiveCamera, state.size.height, reducedMotion()));
  return <primitive object={system.root} />;
}
