"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Camera } from "three";
import type { HuntEngine } from "../engine/HuntEngine";
import { ViewmodelSystem } from "./systems/viewmodel";

/**
 * First-person gun / camera with hands, drawn in its own scene and camera after
 * the world (so it never clips, never shows in the lake and never ends up in photos).
 * Player skin and shirt colours come from their character.
 */
export function Viewmodel({ engine, mainCamera, skin, sleeve, reducedMotion }: { engine: HuntEngine; mainCamera: Camera; skin: string; sleeve: string; reducedMotion: () => boolean }) {
  const system = useMemo(() => new ViewmodelSystem(skin, sleeve), [skin, sleeve]);
  useEffect(() => () => system.dispose(), [system]);
  useEffect(() => engine.events.on((e) => system.onEvent(e, reducedMotion())), [engine, system, reducedMotion]);
  useFrame((_, dt) => system.update(dt, engine, mainCamera, reducedMotion()));
  return <primitive object={system.root} />;
}
