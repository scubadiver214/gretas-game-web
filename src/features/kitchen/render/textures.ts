import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

const cache = new Map<string, CanvasTexture>();

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function finish(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * A round badge with an emoji (crate labels, pizza feedback). Cached by
 * content, shared by every sprite that shows the same thing.
 */
export function badgeTexture(emoji: string, bg: string, ring = "#0B0F17"): Texture {
  const key = `badge|${emoji}|${bg}|${ring}`;
  let t = cache.get(key);
  if (!t) {
    const [c, g] = canvas(128, 128);
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fillStyle = bg;
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = ring;
    g.stroke();
    g.font = "72px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#FFFFFF";
    g.fillText(emoji, 64, 70);
    t = finish(c);
    cache.set(key, t);
  }
  return t;
}

/** Kitchen floor: big cream and terracotta tiles with grout lines. */
export function floorTexture(width: number, depth: number): Texture {
  const key = `floor|${width}|${depth}`;
  let t = cache.get(key);
  if (!t) {
    const [c, g] = canvas(128, 128);
    const tiles = [
      ["#EFE3CF", "#E2CFB2"],
      ["#E2CFB2", "#EFE3CF"],
    ];
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        g.fillStyle = tiles[y][x];
        g.fillRect(x * 64, y * 64, 64, 64);
      }
    }
    g.strokeStyle = "rgba(120,90,60,0.35)";
    g.lineWidth = 3;
    for (let i = 0; i <= 128; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 128);
      g.moveTo(0, i);
      g.lineTo(128, i);
      g.stroke();
    }
    t = finish(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(width / 2, depth / 2);
    cache.set(key, t);
  }
  return t;
}

/** Warm brick for the oven domes. */
export function brickTexture(): Texture {
  let t = cache.get("brick");
  if (!t) {
    const [c, g] = canvas(128, 128);
    g.fillStyle = "#8E3B23";
    g.fillRect(0, 0, 128, 128);
    const rows = 8;
    const h = 128 / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 16 : 0;
      for (let x = -32; x < 128; x += 32) {
        const shade = 150 + ((r * 7 + x) % 5) * 12;
        g.fillStyle = `rgb(${shade + 40},${Math.round(shade / 2.2)},${Math.round(shade / 3.2)})`;
        g.fillRect(x + off + 2, r * h + 2, 28, h - 4);
      }
    }
    t = finish(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    cache.set("brick", t);
  }
  return t;
}

/** Wood grain for crates, boards and the dough table. */
export function woodTexture(): Texture {
  let t = cache.get("wood");
  if (!t) {
    const [c, g] = canvas(64, 64);
    g.fillStyle = "#C48A55";
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = i % 2 ? "rgba(90,50,20,0.25)" : "rgba(255,230,190,0.18)";
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      const y = (i * 64) / 14 + 2;
      g.moveTo(0, y);
      g.bezierCurveTo(20, y + 3, 44, y - 3, 64, y + 1);
      g.stroke();
    }
    t = finish(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    cache.set("wood", t);
  }
  return t;
}
