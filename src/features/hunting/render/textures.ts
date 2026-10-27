import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2D canvas unavailable");
  return [c, g];
}

/** Varnished walnut: warm base, long wavy grain lines and a few darker figure streaks. */
export function woodTexture(): CanvasTexture {
  const [c, g] = canvas(1024, 256);
  const base = g.createLinearGradient(0, 0, 0, 256);
  base.addColorStop(0, "#7a4322");
  base.addColorStop(0.5, "#8d5129");
  base.addColorStop(1, "#6a381c");
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 256);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 170; i++) {
    const y0 = rnd() * 256;
    const amp = 2 + rnd() * 9;
    const freq = 0.004 + rnd() * 0.01;
    const phase = rnd() * 10;
    g.strokeStyle = rnd() < 0.8 ? `rgba(48,22,8,${0.08 + rnd() * 0.22})` : `rgba(190,120,70,${0.08 + rnd() * 0.12})`;
    g.lineWidth = 0.6 + rnd() * 2.2;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase * 2) * amp * 0.25;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = rnd() * 1024;
    const grad = g.createRadialGradient(x, rnd() * 256, 2, x, rnd() * 256, 60 + rnd() * 60);
    grad.addColorStop(0, "rgba(40,18,6,0.25)");
    grad.addColorStop(1, "rgba(40,18,6,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 256);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Star-shaped muzzle flash. */
export function flashTexture(): CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.translate(128, 128);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 120);
  glow.addColorStop(0, "rgba(255,255,235,1)");
  glow.addColorStop(0.18, "rgba(255,226,120,0.95)");
  glow.addColorStop(0.45, "rgba(255,150,40,0.45)");
  glow.addColorStop(1, "rgba(255,90,10,0)");
  g.fillStyle = glow;
  g.beginPath();
  const spikes = 9;
  for (let i = 0; i <= spikes * 2; i++) {
    const r = i % 2 === 0 ? 125 : 38;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function smokeTexture(): CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(235,235,230,0.7)");
  grad.addColorStop(0.5, "rgba(220,220,215,0.3)");
  grad.addColorStop(1, "rgba(210,210,205,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
