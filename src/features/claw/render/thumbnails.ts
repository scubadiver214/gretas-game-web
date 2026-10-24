"use client";

import { useEffect, useState } from "react";
import { AmbientLight, DirectionalLight, Group, PerspectiveCamera, PointLight, Scene, WebGLRenderer } from "three";
import { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../content/prizes";
import { buildToy } from "./toys";

/**
 * Still images of the toys for the collection shelves, rendered once from the
 * same procedural models the machine uses and cached as data URLs. One hidden
 * WebGL context is shared by every thumbnail; work is spread one toy per
 * animation frame so a 45-card grid never janks.
 */

interface Studio {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  kit: MeshKit;
  stage: Group;
}

let studio: Studio | null | undefined;
const cache = new Map<string, string>();
const queue: { key: string; prize: PrizeDef; size: number; glow: string; cb: (url: string | null) => void }[] = [];
let draining = false;

function getStudio(): Studio | null {
  if (studio !== undefined) return studio;
  if (typeof document === "undefined") return (studio = null);
  try {
    const canvas = document.createElement("canvas");
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0.55, 3.9);
    camera.lookAt(0, 0.05, 0);
    scene.add(new AmbientLight("#FFFFFF", 1.1));
    const sun = new DirectionalLight("#FFFFFF", 2.2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const stage = new Group();
    stage.rotation.set(0.1, -0.4, 0);
    scene.add(stage);
    studio = { renderer, scene, camera, kit: new MeshKit(), stage };
  } catch (err) {
    console.warn("[claw] thumbnails unavailable", err);
    studio = null;
  }
  return studio;
}

function renderNow(prize: PrizeDef, size: number, glow: string): string | null {
  const s = getStudio();
  if (!s) return null;
  s.renderer.setSize(size, size, false);
  const light = new PointLight(glow, 8, 10, 1.6);
  light.position.set(-3, 2, 2);
  const toy = buildToy(s.kit, prize);
  toy.scale.setScalar(1);
  s.stage.add(toy);
  s.scene.add(light);
  s.renderer.render(s.scene, s.camera);
  const url = s.renderer.domElement.toDataURL("image/png");
  s.stage.remove(toy);
  s.scene.remove(light);
  return url;
}

function drain(): void {
  if (draining) return;
  draining = true;
  const step = () => {
    const job = queue.shift();
    if (!job) {
      draining = false;
      return;
    }
    let url = cache.get(job.key) ?? null;
    if (!url) {
      url = renderNow(job.prize, job.size, job.glow);
      if (url) cache.set(job.key, url);
    }
    job.cb(url);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Asks for a thumbnail; `cb` fires (possibly synchronously) with a data URL, or null if WebGL is unavailable. Returns a cancel function. */
export function requestToyThumbnail(prize: PrizeDef, size: number, glow: string, cb: (url: string | null) => void): () => void {
  const key = `${prize.id}|${size}|${glow}`;
  const hit = cache.get(key);
  if (hit) {
    cb(hit);
    return () => undefined;
  }
  const job = { key, prize, size, glow, cb };
  queue.push(job);
  drain();
  return () => {
    const i = queue.indexOf(job);
    if (i >= 0) queue.splice(i, 1);
  };
}

export function useToyThumbnail(prize: PrizeDef, size = 160, glow = "#FF8AD0"): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(`${prize.id}|${size}|${glow}`) ?? null);
  useEffect(() => requestToyThumbnail(prize, size, glow, setUrl), [prize, size, glow]);
  return url;
}
