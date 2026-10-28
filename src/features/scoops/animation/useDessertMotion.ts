"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { CurrentCreation } from "../types";
import { applyMotion, clearMotion } from "./applyMotion";
import { buildScene } from "./scene";
import { computeFrame, noticeBetween, type MotionSnapshot } from "./sim";

export interface MotionHud extends MotionSnapshot {
  notice: string | null;
}

interface LiveBag {
  svg: RefObject<SVGSVGElement | null>;
  creation: CurrentCreation;
  assembleKey: number;
  onMotion?: (hud: MotionHud) => void;
  startedAt: number | null;
  scoopBorn: Map<number, number>;
  pieceBorn: Map<string, number>;
  seenAssemble: number;
  last: MotionSnapshot | null;
}

function paintDessert(bag: LiveBag, now: number): void {
  const svg = bag.svg.current;
  if (!svg) return;
  if (bag.seenAssemble !== bag.assembleKey) {
    bag.seenAssemble = bag.assembleKey;
    bag.scoopBorn.clear();
    bag.pieceBorn.clear();
  }
  const scene = buildScene(bag.creation);
  if (scene.scoops.length === 0) {
    bag.startedAt = null;
    bag.scoopBorn.clear();
    bag.pieceBorn.clear();
    clearMotion(svg);
    if (!bag.last || bag.last.stage !== "fresh" || bag.last.band !== "stable") {
      const snap: MotionSnapshot = { stage: "fresh", band: "stable", melt: 0, load: 0 };
      bag.last = snap;
      bag.onMotion?.({ ...snap, notice: null });
    }
    return;
  }
  if (bag.startedAt === null) bag.startedAt = now;
  scene.scoops.forEach((scoop) => {
    if (!bag.scoopBorn.has(scoop.index)) bag.scoopBorn.set(scoop.index, now);
  });
  for (const index of bag.scoopBorn.keys()) {
    if (!scene.scoops.some((scoop) => scoop.index === index)) bag.scoopBorn.delete(index);
  }
  scene.pieces.forEach((piece) => {
    if (!bag.pieceBorn.has(piece.key)) bag.pieceBorn.set(piece.key, now);
  });
  for (const key of bag.pieceBorn.keys()) {
    if (!scene.pieces.some((piece) => piece.key === key)) bag.pieceBorn.delete(key);
  }
  const elapsed = (now - bag.startedAt) / 1000;
  const frame = computeFrame(scene, {
    elapsed,
    scoopAges: scene.scoops.map((scoop) => (now - (bag.scoopBorn.get(scoop.index) ?? now)) / 1000),
    pieceAges: scene.pieces.map((piece) => (now - (bag.pieceBorn.get(piece.key) ?? now)) / 1000),
  });
  applyMotion(svg, frame, String(bag.assembleKey));
  const snap: MotionSnapshot = { stage: frame.stage, band: frame.band, melt: frame.melt, load: frame.load };
  const prev = bag.last;
  if (!prev || prev.stage !== snap.stage || prev.band !== snap.band) {
    const notice = noticeBetween(prev, snap, scene.hasSprinkles);
    bag.last = snap;
    bag.onMotion?.( { ...snap, notice });
  }
}

/**
 * One animation frame loop for the live dessert.
 * The clock starts when the first scoop exists and resets when the scoops are cleared.
 * Recipe data is read. It is never written.
 */
export function useDessertMotion(
  svgRef: RefObject<SVGSVGElement | null>,
  active: boolean,
  creation: CurrentCreation,
  assembleKey: number,
  onMotion?: (hud: MotionHud) => void,
): void {
  const bag = useRef<LiveBag>({
    svg: svgRef,
    creation,
    assembleKey,
    onMotion,
    startedAt: null,
    scoopBorn: new Map(),
    pieceBorn: new Map(),
    seenAssemble: assembleKey,
    last: null,
  });

  useLayoutEffect(() => {
    const live = bag.current;
    live.svg = svgRef;
    live.creation = creation;
    live.assembleKey = assembleKey;
    live.onMotion = onMotion;
    const svg = svgRef.current;
    if (!active) {
      if (svg) clearMotion(svg);
      return;
    }
    paintDessert(live, performance.now());
  });

  useEffect(() => {
    if (!active) return;
    const live = bag.current;
    const scoops = live.scoopBorn;
    const pieces = live.pieceBorn;
    let raf = 0;
    let cancelled = false;
    const loop = (now: number) => {
      if (cancelled) return;
      paintDessert(live, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      live.startedAt = null;
      live.last = null;
      scoops.clear();
      pieces.clear();
      const svg = live.svg.current;
      if (svg) clearMotion(svg);
    };
  }, [active]);
}
