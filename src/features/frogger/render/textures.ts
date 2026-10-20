import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { mulberry32 } from "@/lib/rng";

/** All procedural textures are drawn once per renderer; nothing is downloaded. */
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Bark streaks running along the log (texture u wraps around, v runs along the length). */
export function barkTexture(): Texture {
  const rnd = mulberry32(7);
  const tex = canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = "#8B5A2B";
    ctx.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 128;
      ctx.fillStyle = rnd() > 0.5 ? "#6B4220" : "#A26A35";
      ctx.fillRect(x, 0, 2 + rnd() * 4, 64);
    }
    // A few knots.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#5A3518";
      ctx.beginPath();
      ctx.ellipse(rnd() * 128, rnd() * 64, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

/** Tree rings for the cut ends of a log. */
export function logEndTexture(): Texture {
  return canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = "#6B4220";
    ctx.fillRect(0, 0, 64, 64);
    const rings = ["#D9A66B", "#C68E52", "#E3B67E", "#C68E52", "#B47A40"];
    rings.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 32, 28 - i * 5.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/** Hexagon plates on a turtle shell. */
export function shellTexture(): Texture {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = "#2E8B3E";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#1B5E2A";
    ctx.lineWidth = 4;
    const r = 14;
    for (let row = -1; row < 7; row++) {
      for (let col = -1; col < 6; col++) {
        const cx = col * r * 1.75 + (row % 2 ? r * 0.87 : 0);
        const cy = row * r * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = (row + col) % 2 ? "#3FA34D" : "#36964A";
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

/** Side panel of the box trucks: an original "Greta's" delivery logo. */
export function truckLogoTexture(): Texture {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = "#FFD233";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#F2542D";
    ctx.fillRect(0, 104, 256, 10);
    ctx.font = "bold 58px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#B8210F";
    ctx.strokeText("Greta's", 128, 52);
    ctx.fillStyle = "#FF6A3D";
    ctx.fillText("Greta's", 128, 52);
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#7A2E10";
    ctx.fillText("FROG EXPRESS", 128, 92);
  });
}

/** Mown-grass stripes. */
export function grassTexture(): Texture {
  const rnd = mulberry32(11);
  const tex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = "#58C05A";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#4FB451";
    ctx.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rnd() > 0.5 ? "#6BD46A" : "#46A848";
      ctx.fillRect(rnd() * 128, rnd() * 128, 2, 3);
    }
  });
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}
