"use client";

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Scene } from "three";
import { EYE } from "../config";
import type { HuntEngine } from "../engine/HuntEngine";
import { Animals } from "./Animals";
import type { CanvasBridge } from "./bridge";
import { Effects } from "./Effects";
import { driveCamera, fitViewCamera, kickCamera, makeProjector, renderFrame, setupCamera, setupScenes, type CameraKick } from "./systems/frame";
import { Viewmodel } from "./Viewmodel";
import { Terrain } from "./world/Ground";
import { LAKESIDE, SUN_VECTOR } from "./world/palette";
import { Sky, useSkyEnvironment } from "./world/Sky";
import { Vegetation } from "./world/Vegetation";
import { Water } from "./world/Water";

interface Props {
  engine: HuntEngine;
  lowPower: boolean;
  skin: string;
  sleeve: string;
  reducedMotion: () => boolean;
  bridge: CanvasBridge;
  onReady: () => void;
  onFail: () => void;
}

class CanvasBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[hunting] 3D view failed", err);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Driver({ engine }: { engine: HuntEngine }) {
  const size = useThree((s) => s.size);
  useEffect(() => engine.setViewport(size.width / Math.max(1, size.height)), [engine, size]);
  useFrame((_, dt) => engine.advance(dt), -3);
  return null;
}

function CameraRig({ engine, reducedMotion }: { engine: HuntEngine; reducedMotion: () => boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const kick = useRef<CameraKick>({ x: 0, v: 0 });
  useEffect(() => setupCamera(camera), [camera]);
  useEffect(
    () =>
      engine.events.on((e) => {
        if (e.type === "shot" && e.tool === "shotgun") kickCamera(kick.current, reducedMotion());
      }),
    [engine, reducedMotion],
  );
  useFrame((_, dt) => driveCamera(camera, engine, kick.current, dt, reducedMotion()), -2);
  return null;
}

function Passes({ viewScene, viewCamera, bridge, onReady }: { viewScene: Scene; viewCamera: PerspectiveCamera; bridge: CanvasBridge; onReady: () => void }) {
  const size = useThree((s) => s.size);
  const frames = useRef(0);
  const grab = useMemo(() => (typeof document === "undefined" ? null : document.createElement("canvas")), []);
  useEffect(() => fitViewCamera(viewCamera, size.width, size.height), [viewCamera, size]);
  useFrame(({ gl, scene, camera }) => {
    renderFrame(gl, scene, camera, viewScene, viewCamera, bridge, grab);
    frames.current++;
    if (frames.current === 2) onReady();
  }, 1);
  return null;
}

function SceneRoot(p: Props) {
  const env = useSkyEnvironment();
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const viewScene = useMemo(() => new Scene(), []);
  const viewCamera = useMemo(() => new PerspectiveCamera(52, 1, 0.01, 20), []);
  useEffect(() => setupScenes(scene, viewScene, env), [scene, viewScene, env]);
  useEffect(() => {
    p.bridge.setProjector(makeProjector(camera));
    return () => p.bridge.setProjector(null);
  }, [camera, p.bridge]);
  const sun = useMemo(() => SUN_VECTOR.clone().multiplyScalar(400), []);
  return (
    <>
      <Driver engine={p.engine} />
      <CameraRig engine={p.engine} reducedMotion={p.reducedMotion} />
      <hemisphereLight args={[LAKESIDE.hemiSky, LAKESIDE.hemiGround, 0.95]} />
      <directionalLight position={sun} intensity={2.5} color={LAKESIDE.sun} />
      <Sky />
      <Terrain lowPower={p.lowPower} />
      <Water lowPower={p.lowPower} />
      <Vegetation lowPower={p.lowPower} />
      <Animals engine={p.engine} />
      <Effects engine={p.engine} reducedMotion={p.reducedMotion} />
      {createPortal(<Viewmodel engine={p.engine} mainCamera={camera} skin={p.skin} sleeve={p.sleeve} reducedMotion={p.reducedMotion} />, viewScene)}
      <Passes viewScene={viewScene} viewCamera={viewCamera} bridge={p.bridge} onReady={p.onReady} />
    </>
  );
}

export default function HuntCanvas(p: Props) {
  return (
    <CanvasBoundary onFail={p.onFail}>
      <Canvas
        dpr={p.lowPower ? [1, 1.5] : [1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
        camera={{ fov: 62, near: 0.3, far: 6000, position: [EYE.x, EYE.y, EYE.z] }}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
        aria-label="Peaceful Lakeside: a mountain lake with ducks flying over it"
        role="img"
      >
        <SceneRoot {...p} />
      </Canvas>
    </CanvasBoundary>
  );
}
