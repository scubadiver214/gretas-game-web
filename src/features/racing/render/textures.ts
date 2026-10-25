import { CanvasTexture, ClampToEdgeWrapping, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "@/lib/rng";
import type { WorldId } from "../world/track";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** The road texture is 2x as tall as it is wide; the road mesh tiles it so one pixel covers the same ground both ways. */
export const ROAD_TEX = { width: 512, height: 1024 } as const;

function canvasTexture(w: number, h: number, draw: Draw, opts: { repeat?: boolean; anisotropy?: number } = {}): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.anisotropy = opts.anisotropy ?? 4;
  if (opts.repeat) {
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
  } else {
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
  }
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws `fn` at the given vertical offsets so noise wraps cleanly at the top and bottom edge of a tiling texture. */
function wrapY(h: number, y: number, r: number, fn: (y: number) => void): void {
  fn(y);
  if (y - r < 0) fn(y + h);
  if (y + r > h) fn(y - h);
}

function drawRoad(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(7);
  const scale = w / 256;
  // Packed dirt.
  ctx.fillStyle = "#7d5733";
  ctx.fillRect(0, 0, w, h);
  // Broad lighter and darker patches.
  for (let i = 0; i < 110; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (30 + rnd() * 70) * scale;
    wrapY(h, y, r, (yy) => {
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      const light = rnd() > 0.5;
      g.addColorStop(0, light ? "rgba(190,142,92,0.28)" : "rgba(60,38,20,0.26)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    });
  }
  // Two tyre ruts, darker with a soft edge.
  for (const cx of [0.33, 0.67]) {
    const g = ctx.createLinearGradient((cx - 0.07) * w, 0, (cx + 0.07) * w, 0);
    g.addColorStop(0, "rgba(40,24,12,0)");
    g.addColorStop(0.5, "rgba(40,24,12,0.42)");
    g.addColorStop(1, "rgba(40,24,12,0)");
    ctx.fillStyle = g;
    ctx.fillRect((cx - 0.07) * w, 0, 0.14 * w, h);
  }
  // Pebbles and grit: small, soft and plentiful, so the dirt reads as texture and not as spots.
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.7 + rnd() * 1.9) * scale;
    const tone = rnd();
    wrapY(h, y, r, (yy) => {
      ctx.fillStyle = tone > 0.55 ? `rgba(206,164,112,${0.1 + rnd() * 0.18})` : `rgba(44,28,16,${0.1 + rnd() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, yy, r * 1.25, r, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Edges blend out to sand: fade the alpha so the road settles into the ground.
  ctx.globalCompositeOperation = "destination-in";
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(0.05, "rgba(0,0,0,0.55)");
  edge.addColorStop(0.1, "rgba(0,0,0,1)");
  edge.addColorStop(0.9, "rgba(0,0,0,1)");
  edge.addColorStop(0.95, "rgba(0,0,0,0.55)");
  edge.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

/** Soft transparent edges, so a road made of loose material settles into the ground beside it. */
function fadeRoadEdges(ctx: CanvasRenderingContext2D, w: number, h: number, inner: number, outer: number): void {
  ctx.globalCompositeOperation = "destination-in";
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(outer, "rgba(0,0,0,0.55)");
  edge.addColorStop(inner, "rgba(0,0,0,1)");
  edge.addColorStop(1 - inner, "rgba(0,0,0,1)");
  edge.addColorStop(1 - outer, "rgba(0,0,0,0.55)");
  edge.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

/** A dashed line down the middle: `dashes` repeats per tile, so it joins up where the texture wraps. */
function dashedCentre(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, dashes: number, lineWidth: number): void {
  const period = h / dashes;
  ctx.fillStyle = color;
  for (let i = 0; i < dashes; i++) ctx.fillRect(w / 2 - lineWidth / 2, i * period + period * 0.12, lineWidth, period * 0.5);
}

function drawSnowRoad(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(17);
  const scale = w / 256;
  // Packed, plowed snow: grey-blue so it reads against the fresh white either side.
  ctx.fillStyle = "#aebdd0";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (30 + rnd() * 70) * scale;
    wrapY(h, y, r, (yy) => {
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      const light = rnd() > 0.45;
      g.addColorStop(0, light ? "rgba(240,247,255,0.32)" : "rgba(104,124,150,0.26)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    });
  }
  // Two tyre tracks worn down to the ice.
  for (const cx of [0.33, 0.67]) {
    const g = ctx.createLinearGradient((cx - 0.07) * w, 0, (cx + 0.07) * w, 0);
    g.addColorStop(0, "rgba(70,92,120,0)");
    g.addColorStop(0.5, "rgba(70,92,120,0.4)");
    g.addColorStop(1, "rgba(70,92,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect((cx - 0.07) * w, 0, 0.14 * w, h);
  }
  // Ice sparkle and grit.
  for (let i = 0; i < 6500; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.6 + rnd() * 1.6) * scale;
    const tone = rnd();
    wrapY(h, y, r, (yy) => {
      ctx.fillStyle = tone > 0.5 ? `rgba(255,255,255,${0.12 + rnd() * 0.3})` : `rgba(70,88,112,${0.1 + rnd() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, yy, r * 1.2, r, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Bright orange edge lines and a white dashed centre, so the way is easy to follow in the white.
  ctx.fillStyle = "rgba(255,122,26,0.95)";
  ctx.fillRect(w * 0.085, 0, w * 0.022, h);
  ctx.fillRect(w * 0.893, 0, w * 0.022, h);
  dashedCentre(ctx, w, h, "rgba(255,255,255,0.88)", 4, w * 0.016);
  fadeRoadEdges(ctx, w, h, 0.07, 0.035);
}

function drawTarmac(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(23);
  const scale = w / 256;
  ctx.fillStyle = "#3b3e47";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (30 + rnd() * 70) * scale;
    wrapY(h, y, r, (yy) => {
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      g.addColorStop(0, rnd() > 0.5 ? "rgba(120,124,136,0.16)" : "rgba(12,13,18,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    });
  }
  // Wheel lanes, polished a little darker.
  for (const cx of [0.3, 0.7]) {
    const g = ctx.createLinearGradient((cx - 0.08) * w, 0, (cx + 0.08) * w, 0);
    g.addColorStop(0, "rgba(10,11,16,0)");
    g.addColorStop(0.5, "rgba(10,11,16,0.28)");
    g.addColorStop(1, "rgba(10,11,16,0)");
    ctx.fillStyle = g;
    ctx.fillRect((cx - 0.08) * w, 0, 0.16 * w, h);
  }
  // Grit.
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.5 + rnd() * 1.1) * scale;
    wrapY(h, y, r, (yy) => {
      ctx.fillStyle = rnd() > 0.5 ? `rgba(168,172,184,${0.1 + rnd() * 0.22})` : `rgba(14,15,20,${0.12 + rnd() * 0.24})`;
      ctx.beginPath();
      ctx.arc(x, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // A couple of tar-filled cracks.
  ctx.strokeStyle = "rgba(10,10,14,0.45)";
  ctx.lineWidth = 1.5 * scale;
  for (let i = 0; i < 5; i++) {
    let x = rnd() * w;
    let y = rnd() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (rnd() - 0.5) * 26 * scale;
      y += (6 + rnd() * 18) * scale;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // White edge lines, yellow dashed centre line.
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(w * 0.085, 0, w * 0.02, h);
  ctx.fillRect(w * 0.895, 0, w * 0.02, h);
  dashedCentre(ctx, w, h, "rgba(255,210,63,0.95)", 4, w * 0.018);
  // Crisp tarmac edge with a thin soft fringe.
  fadeRoadEdges(ctx, w, h, 0.05, 0.034);
}

function drawSandRoad(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(41);
  const scale = w / 256;
  // Hard-packed beach sand, a shade darker than the loose sand beside it so the road reads.
  ctx.fillStyle = "#e2c78f";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (30 + rnd() * 70) * scale;
    wrapY(h, y, r, (yy) => {
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      g.addColorStop(0, rnd() > 0.5 ? "rgba(250,238,205,0.3)" : "rgba(170,130,76,0.14)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    });
  }
  for (const cx of [0.33, 0.67]) {
    const g = ctx.createLinearGradient((cx - 0.07) * w, 0, (cx + 0.07) * w, 0);
    g.addColorStop(0, "rgba(120,86,44,0)");
    g.addColorStop(0.5, "rgba(130,96,52,0.26)");
    g.addColorStop(1, "rgba(120,86,44,0)");
    ctx.fillStyle = g;
    ctx.fillRect((cx - 0.07) * w, 0, 0.14 * w, h);
  }
  // Grains, a few tiny shells and pebbles.
  for (let i = 0; i < 7000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.6 + rnd() * 1.5) * scale;
    const tone = rnd();
    wrapY(h, y, r, (yy) => {
      ctx.fillStyle = tone > 0.55 ? `rgba(255,244,214,${0.12 + rnd() * 0.2})` : `rgba(120,90,50,${0.1 + rnd() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(x, yy, r * 1.2, r, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    wrapY(h, y, 4 * scale, (yy) => {
      ctx.fillStyle = rnd() > 0.5 ? "rgba(255,225,230,0.8)" : "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(x, yy, 2.6 * scale, 1.7 * scale, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Turquoise edge lines and a white dashed centre, like a promenade.
  ctx.fillStyle = "rgba(34,196,200,0.9)";
  ctx.fillRect(w * 0.085, 0, w * 0.02, h);
  ctx.fillRect(w * 0.895, 0, w * 0.02, h);
  dashedCentre(ctx, w, h, "rgba(255,255,255,0.85)", 4, w * 0.016);
  fadeRoadEdges(ctx, w, h, 0.07, 0.035);
}

function drawJungleRoad(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(53);
  const scale = w / 256;
  // Red-brown jungle earth.
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (28 + rnd() * 70) * scale;
    wrapY(h, y, r, (yy) => {
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
      g.addColorStop(0, rnd() > 0.5 ? "rgba(188,130,86,0.3)" : "rgba(50,30,20,0.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, yy - r, r * 2, r * 2);
    });
  }
  // Muddy tyre ruts.
  for (const cx of [0.33, 0.67]) {
    const g = ctx.createLinearGradient((cx - 0.07) * w, 0, (cx + 0.07) * w, 0);
    g.addColorStop(0, "rgba(40,24,14,0)");
    g.addColorStop(0.5, "rgba(40,24,14,0.46)");
    g.addColorStop(1, "rgba(40,24,14,0)");
    ctx.fillStyle = g;
    ctx.fillRect((cx - 0.07) * w, 0, 0.14 * w, h);
  }
  // Grit and fallen leaves.
  for (let i = 0; i < 6000; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = (0.7 + rnd() * 1.7) * scale;
    const tone = rnd();
    wrapY(h, y, r, (yy) => {
      ctx.fillStyle = tone > 0.5 ? `rgba(200,150,100,${0.1 + rnd() * 0.18})` : `rgba(40,24,14,${0.1 + rnd() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, yy, r * 1.25, r, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const leaves = ["rgba(74,140,52,0.8)", "rgba(206,140,40,0.75)", "rgba(150,70,34,0.7)"];
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    wrapY(h, y, 6 * scale, (yy) => {
      ctx.fillStyle = leaves[Math.floor(rnd() * leaves.length)];
      ctx.beginPath();
      ctx.ellipse(x, yy, (3 + rnd() * 3) * scale, (1.4 + rnd() * 1.2) * scale, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Bright yellow edge lines (so the way shows through the shade) and a pale dashed centre.
  ctx.fillStyle = "rgba(255,214,70,0.9)";
  ctx.fillRect(w * 0.085, 0, w * 0.02, h);
  ctx.fillRect(w * 0.895, 0, w * 0.02, h);
  dashedCentre(ctx, w, h, "rgba(255,244,214,0.8)", 4, w * 0.016);
  fadeRoadEdges(ctx, w, h, 0.07, 0.035);
}

/** Tiling sea surface: pale ripples on a light base, tinted blue by the water material. Wraps on all four edges. */
function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(61);
  ctx.fillStyle = "#c4eef8";
  ctx.fillRect(0, 0, w, h);
  const wrap = (x: number, y: number, r: number, fn: (x: number, y: number) => void) => {
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) fn(x + dx, y + dy);
  };
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 30 + rnd() * 50;
    wrap(x, y, r, (xx, yy) => {
      const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
      g.addColorStop(0, rnd() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(60,150,200,0.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(xx - r, yy - r, r * 2, r * 2);
    });
  }
  ctx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 12 + rnd() * 26;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + rnd() * 0.45})`;
    ctx.lineWidth = 1.4 + rnd() * 1.6;
    wrap(x, y, len, (xx, yy) => {
      ctx.beginPath();
      ctx.moveTo(xx - len / 2, yy);
      ctx.quadraticCurveTo(xx, yy - 5 - rnd() * 3, xx + len / 2, yy);
      ctx.stroke();
    });
  }
}

/** The Fitzmagic logo for the car: bold italic lettering with a dark outline, lime into cyan into violet, and a few sparkles. */
function drawFitzmagic(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const text = "Fitzmagic";
  let size = h * 0.7;
  ctx.font = `italic 900 ${size}px 'Baloo 2', 'Arial Black', Impact, sans-serif`;
  const fit = (w * 0.8) / Math.max(1, ctx.measureText(text).width);
  size *= Math.min(1, fit);
  ctx.font = `italic 900 ${size}px 'Baloo 2', 'Arial Black', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = w * 0.46;
  const cy = h * 0.5;
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = "#090c13";
  ctx.strokeText(text, cx, cy);
  const grad = ctx.createLinearGradient(w * 0.08, 0, w * 0.86, 0);
  grad.addColorStop(0, "#e8ff3d");
  grad.addColorStop(0.38, "#8ff25a");
  grad.addColorStop(0.7, "#27dccb");
  grad.addColorStop(1, "#8d6cff");
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, cy);
  // A glossy highlight across the top of the letters.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, cy - size * 0.04);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText(text, cx, cy);
  ctx.restore();
  // Sparkles.
  const sparkle = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r : r * 0.25;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#090c13";
  for (const [x, y, r, c] of [
    [w * 0.93, h * 0.24, h * 0.2, "#ffffff"],
    [w * 0.89, h * 0.74, h * 0.11, "#e8ff3d"],
    [w * 0.04, h * 0.3, h * 0.1, "#27dccb"],
  ] as const) {
    sparkle(x, y, r + 3, "#090c13");
    sparkle(x, y, r, c);
  }
}

function drawChecker(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cols = 14;
  const rows = 2;
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#ffffff" : "#16181d";
      ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1);
    }
  }
}

function drawStripes(ctx: CanvasRenderingContext2D, w: number, h: number, a: string, b: string): void {
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  const n = 4;
  for (let i = -n; i < n * 2; i++) {
    const x = (i * w) / n;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w / (n * 2), 0);
    ctx.lineTo(x + w / (n * 2) - h, h);
    ctx.lineTo(x - h, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const c = w / 2;
  const g = ctx.createRadialGradient(c * 0.8, c * 0.75, 4, c, c, c);
  g.addColorStop(0, "#ffe98a");
  g.addColorStop(0.7, "#ffc21f");
  g.addColorStop(1, "#d98c00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Raised rim.
  ctx.lineWidth = w * 0.06;
  ctx.strokeStyle = "#ffd94f";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = w * 0.02;
  ctx.strokeStyle = "#c27a00";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  // Star.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? c * 0.52 : c * 0.22;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = "#fff2a8";
  ctx.fill();
  ctx.lineWidth = w * 0.02;
  ctx.strokeStyle = "#d9960a";
  ctx.stroke();
}

function drawArrowSign(ctx: CanvasRenderingContext2D, w: number, h: number, flip: boolean): void {
  ctx.save();
  if (flip) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, w, h, 26);
  ctx.fill();
  ctx.fillStyle = "#d62f2f";
  roundRect(ctx, 14, 14, w - 28, h - 28, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, cy - h * 0.12);
  ctx.lineTo(w * 0.55, cy - h * 0.12);
  ctx.lineTo(w * 0.55, cy - h * 0.28);
  ctx.lineTo(w * 0.82, cy);
  ctx.lineTo(w * 0.55, cy + h * 0.28);
  ctx.lineTo(w * 0.55, cy + h * 0.12);
  ctx.lineTo(w * 0.2, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, bg: string, fg: string): void {
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, w, h, 22);
  ctx.fill();
  // Chequered trim.
  const n = 32;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#16181d";
    ctx.fillRect((i * w) / n, 4, w / n, 12);
    ctx.fillRect((i * w) / n, h - 16, w / n, 12);
  }
  ctx.fillStyle = fg;
  ctx.font = "900 78px 'Baloo 2', 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeText(text, w / 2, h / 2 + 4);
  ctx.fillText(text, w / 2, h / 2 + 4);
}

function drawCloud(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(21);
  for (let i = 0; i < 9; i++) {
    const x = w * (0.2 + rnd() * 0.6);
    const y = h * (0.45 + rnd() * 0.2);
    const r = h * (0.22 + rnd() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.55, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawPlanks(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rnd = mulberry32(31);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const tone = 0.85 + rnd() * 0.3;
    ctx.fillStyle = `rgb(${Math.round(186 * tone)},${Math.round(128 * tone)},${Math.round(70 * tone)})`;
    ctx.fillRect(0, (i * h) / n, w, h / n - 3);
    ctx.fillStyle = "rgba(60,32,12,0.25)";
    for (let k = 0; k < 8; k++) ctx.fillRect(rnd() * w, (i * h) / n + rnd() * (h / n - 4), 30 + rnd() * 50, 2);
  }
  // Yellow guide stripes down the edges.
  ctx.fillStyle = "#ffcf1f";
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
}

/** A soft round snowflake for the falling-snow points. */
function drawFlake(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A tall, thin streak for rain points (the rest of the square stays empty). */
function drawDrop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(210,230,255,0)");
  g.addColorStop(0.18, "rgba(220,235,255,0.95)");
  g.addColorStop(1, "rgba(170,200,230,0)");
  ctx.fillStyle = g;
  ctx.fillRect(w * 0.47, 0, w * 0.06, h);
}

const ROAD_DRAW: Record<WorldId, Draw> = { desert: drawRoad, winter: drawSnowRoad, alpine: drawTarmac, beach: drawSandRoad, jungle: drawJungleRoad };

/** All the procedural textures the racing scene needs. Created once per renderer and disposed with it. */
export class RacingTextures {
  /** The road surface for the loaded world; `setWorld` swaps it. */
  road = canvasTexture(ROAD_TEX.width, ROAD_TEX.height, drawRoad, { repeat: true, anisotropy: 8 });
  private roadWorld: WorldId = "desert";
  readonly checker = canvasTexture(448, 64, drawChecker);
  readonly archRed = canvasTexture(128, 128, (c, w, h) => drawStripes(c, w, h, "#e53935", "#ffffff"), { repeat: true });
  readonly archBlue = canvasTexture(128, 128, (c, w, h) => drawStripes(c, w, h, "#1e88e5", "#ffffff"), { repeat: true });
  readonly coin = canvasTexture(128, 128, drawCoin);
  readonly fitzmagic = canvasTexture(1024, 256, drawFitzmagic, { anisotropy: 8 });
  readonly arrowRight = canvasTexture(256, 192, (c, w, h) => drawArrowSign(c, w, h, false));
  readonly arrowLeft = canvasTexture(256, 192, (c, w, h) => drawArrowSign(c, w, h, true));
  readonly bannerStart = canvasTexture(512, 128, (c, w, h) => drawBanner(c, w, h, "START / FINISH", "#e53935", "#ffffff"));
  readonly bannerGate = canvasTexture(512, 128, (c, w, h) => drawBanner(c, w, h, "CHECKPOINT", "#1e88e5", "#ffffff"));
  readonly cloud = canvasTexture(256, 128, drawCloud);
  readonly flake = canvasTexture(64, 64, drawFlake);
  readonly drop = canvasTexture(32, 64, drawDrop);
  readonly planks = canvasTexture(128, 128, drawPlanks);
  readonly water = canvasTexture(256, 256, drawWater, { repeat: true, anisotropy: 4 });

  /** Paints the road for a world. The other textures are the same everywhere. */
  setWorld(world: WorldId): void {
    if (world === this.roadWorld) return;
    this.road.dispose();
    this.road = canvasTexture(ROAD_TEX.width, ROAD_TEX.height, ROAD_DRAW[world], { repeat: true, anisotropy: 8 });
    this.roadWorld = world;
  }

  dispose(): void {
    for (const t of Object.values(this)) if (t instanceof CanvasTexture) t.dispose();
  }
}
