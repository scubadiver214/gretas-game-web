import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { mulberry32 } from "@/lib/rng";

/** All procedural textures are drawn once per renderer; nothing is downloaded. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
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

/**
 * The lit marquee sign on top of the cabinet. `aspect` is the sign face's
 * width / height so the lettering is never stretched; the text shrinks until
 * it fits between the stars.
 */
export function marqueeTexture(title: string, bg: string, fg: string, accent: string, family: string, aspect: number): Texture {
  const h = 180;
  const w = Math.round(h * aspect);
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Candy stripes behind the text.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#FFFFFF";
    for (let x = -h; x < w; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 27, 0);
      ctx.lineTo(x + 27 + 90, h);
      ctx.lineTo(x + 90, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const starX = h * 0.42;
    const room = w - starX * 4;
    let size = h * 0.62;
    ctx.font = `${size}px ${family}`;
    while (ctx.measureText(title).width > room && size > 24) {
      size -= 4;
      ctx.font = `${size}px ${family}`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = accent;
    // Cursive faces sit low in their box; nudge up so it looks centred.
    const y = h * 0.48;
    ctx.strokeText(title, w / 2, y);
    ctx.fillStyle = fg;
    ctx.fillText(title, w / 2, y);
    // Stars either side.
    for (const cx of [starX, w - starX]) star(ctx, cx, h / 2, h * 0.17, h * 0.07);
  });
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Back wall inside the cabinet: soft polka dots. */
export function backdropTexture(base: string, dot: string): Texture {
  const tex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = dot;
    ctx.globalAlpha = 0.35;
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        ctx.beginPath();
        ctx.arc(x + 16 + ((y / 32) % 2) * 8, y + 16, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

/** Cabinet floor: a chequerboard in two tints of the world's floor colour. */
export function floorTexture(a: string, b: string): Texture {
  const tex = canvasTexture(128, 128, (ctx) => {
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 ? a : b;
        ctx.fillRect(x * 64, y * 64, 64, 64);
      }
    }
  });
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

/** Side panel decal: an original "Bea's Claw-some" sticker. */
export function stickerTexture(accent: string): Texture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(128, 128, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    star(ctx, 128, 112, 46, 20);
    ctx.font = "800 30px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BEA'S", 128, 170);
    ctx.font = "800 22px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
    ctx.fillText("CLAW-SOME", 128, 198);
  });
}

/** Round label for slime jars. */
export function jarLabelTexture(color: string): Texture {
  const rnd = mulberry32(3);
  return canvasTexture(128, 64, (ctx) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 10);
    ctx.fillRect(0, 54, 128, 10);
    ctx.font = "800 26px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText("SLIME", 64, 32);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.5})`;
      ctx.fillRect(rnd() * 128, 14 + rnd() * 36, 2, 2);
    }
  });
}
