import type { DripPose, MotionFrame, PiecePose, PuddlePose, SaucePose, ScoopPose } from "./sim";

function num(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

export function scoopTransform(pose: ScoopPose): string {
  return `translate(${num(pose.tx)} ${num(pose.ty)}) translate(${num(pose.cx)} ${num(pose.cy)}) rotate(${num(pose.rot)}) scale(${num(pose.sx)} ${num(pose.sy)}) translate(${num(-pose.cx)} ${num(-pose.cy)})`;
}

export function pieceTransform(piece: PiecePose): string {
  return `translate(${num(piece.x)} ${num(piece.y)}) rotate(${num(piece.rot)}) scale(${num(piece.sx)} ${num(piece.sy)}) translate(${num(-piece.homeX)} ${num(-piece.homeY)})`;
}

interface MotionCache {
  sig: string;
  scoops: SVGGElement[];
  pieces: Map<string, SVGTextElement>;
  drips: SVGEllipseElement[];
  sauces: Map<string, SVGPathElement>;
  drops: Map<string, SVGCircleElement>;
  puddle: SVGEllipseElement | null;
  accent: SVGEllipseElement | null;
  crown: SVGGElement | null;
}

const caches = new WeakMap<SVGSVGElement, MotionCache>();

function readCache(svg: SVGSVGElement, sig: string): MotionCache {
  const cached = caches.get(svg);
  if (cached && cached.sig === sig) return cached;
  const next: MotionCache = {
    sig,
    scoops: Array.from(svg.querySelectorAll<SVGGElement>("[data-scoop]")),
    pieces: new Map(Array.from(svg.querySelectorAll<SVGTextElement>("[data-piece]")).map((node) => [node.dataset.piece ?? "", node])),
    drips: Array.from(svg.querySelectorAll<SVGEllipseElement>("[data-drip]")),
    sauces: new Map(Array.from(svg.querySelectorAll<SVGPathElement>("[data-sauce]")).map((node) => [node.dataset.sauce ?? "", node])),
    drops: new Map(Array.from(svg.querySelectorAll<SVGCircleElement>("[data-sauce-drop]")).map((node) => [node.dataset.sauceDrop ?? "", node])),
    puddle: svg.querySelector<SVGEllipseElement>("[data-puddle='0']"),
    accent: svg.querySelector<SVGEllipseElement>("[data-puddle='1']"),
    crown: svg.querySelector<SVGGElement>("[data-crown]"),
  };
  caches.set(svg, next);
  return next;
}

function paintPuddle(node: SVGEllipseElement | null, pose: PuddlePose, which: "main" | "accent"): void {
  if (!node) return;
  if (which === "main") {
    node.setAttribute("rx", num(pose.rx));
    node.setAttribute("ry", num(pose.ry));
    node.setAttribute("opacity", num(pose.opacity));
    node.setAttribute("fill", pose.color);
    return;
  }
  node.setAttribute("cx", num(pose.accentCx));
  node.setAttribute("rx", num(pose.accentRx));
  node.setAttribute("ry", num(pose.ry * 0.8));
  node.setAttribute("opacity", num(pose.accentOpacity));
  node.setAttribute("fill", pose.accentColor);
}

function paintDrip(node: SVGEllipseElement | undefined, drip: DripPose | undefined): void {
  if (!node) return;
  if (!drip || drip.opacity <= 0.02) {
    node.setAttribute("opacity", "0");
    return;
  }
  node.setAttribute("cx", num(drip.cx));
  node.setAttribute("cy", num(drip.cy));
  node.setAttribute("rx", num(drip.rx));
  node.setAttribute("ry", num(drip.ry));
  node.setAttribute("fill", drip.color);
  node.setAttribute("opacity", num(drip.opacity));
}

function paintSauce(path: SVGPathElement | undefined, drop: SVGCircleElement | undefined, sauce: SaucePose | undefined): void {
  if (path && sauce) {
    path.setAttribute("d", sauce.d);
    path.setAttribute("stroke-width", num(sauce.width));
    path.removeAttribute("stroke-dasharray");
    path.removeAttribute("stroke-dashoffset");
  }
  if (!drop) return;
  if (!sauce) {
    drop.setAttribute("opacity", "0");
    return;
  }
  drop.setAttribute("cx", num(sauce.dropX));
  drop.setAttribute("cy", num(sauce.dropY));
  drop.setAttribute("r", num(Math.max(4, sauce.width * 0.38)));
  drop.setAttribute("opacity", num(sauce.dropOpacity));
}

/** Write one frame onto the svg. React does not own these attributes. */
export function applyMotion(svg: SVGSVGElement, frame: MotionFrame, cacheKey: string): void {
  const cache = readCache(svg, `${cacheKey}|${frame.sig}`);
  svg.dataset.meltStage = frame.stage;
  frame.scoops.forEach((pose) => {
    const node = cache.scoops.find((scoop) => scoop.dataset.scoop === String(pose.index));
    node?.setAttribute("transform", scoopTransform(pose));
  });
  if (cache.crown && frame.crown) cache.crown.setAttribute("transform", scoopTransform(frame.crown));
  frame.pieces.forEach((piece) => {
    const node = cache.pieces.get(piece.key);
    if (!node) return;
    node.setAttribute("transform", pieceTransform(piece));
    node.setAttribute("opacity", num(piece.opacity));
  });
  for (let i = 0; i < cache.drips.length; i++) paintDrip(cache.drips[i], frame.drips[i]);
  frame.sauces.forEach((sauce) => paintSauce(cache.sauces.get(sauce.id), cache.drops.get(sauce.id), sauce));
  paintPuddle(cache.puddle, frame.puddle, "main");
  paintPuddle(cache.accent, frame.puddle, "accent");
}

export function clearMotion(svg: SVGSVGElement): void {
  caches.delete(svg);
  delete svg.dataset.meltStage;
  svg.querySelectorAll<SVGElement>("[data-scoop], [data-crown], [data-piece]").forEach((node) => {
    node.removeAttribute("transform");
    node.removeAttribute("opacity");
  });
  svg.querySelectorAll<SVGElement>("[data-drip], [data-puddle], [data-sauce-drop]").forEach((node) => {
    node.setAttribute("opacity", "0");
  });
  svg.querySelectorAll<SVGPathElement>("[data-sauce]").forEach((node) => {
    node.removeAttribute("stroke-dasharray");
    node.removeAttribute("stroke-dashoffset");
  });
}
