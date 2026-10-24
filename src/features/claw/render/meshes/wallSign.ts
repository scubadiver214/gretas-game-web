import { CanvasTexture, Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, type Group } from "three";
import type { MeshKit } from "@/components/three/kit";

/** Where the arcade's back wall stands, behind the cabinet. */
export const WALL_Z = -7;

/** Overall brightness of the sign: lit, but well below the toys and the marquee. */
const SIGN_OPACITY = 0.62;

export type SignLayout = "sides" | "top" | "none";

interface SignPanel {
  mesh: Mesh;
  material: MeshBasicMaterial;
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  lines: string[];
  /** Width / height of the drawn texture (world placement keeps it). */
  aspect: number;
}

const LINE_PX = 220;
const WIDTH_PX = 1024;

function mixWithWhite(hex: string, amount: number): string {
  return `#${new Color(hex).lerp(new Color("#FFFFFF"), amount).getHexString()}`;
}

/**
 * Draws cursive neon text on a transparent canvas: a soft highlight wash
 * behind it, a wide coloured glow, then a pale core so it reads as a lit
 * tube rather than flat paint.
 */
function drawNeon(panel: SignPanel, color: string, family: string): void {
  const { canvas, lines } = panel;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Elliptical wash that fades to nothing inside the canvas, so no edge ever shows.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.47);
  wash.addColorStop(0, `${color}40`);
  wash.addColorStop(0.6, `${color}18`);
  wash.addColorStop(1, `${color}00`);
  ctx.fillStyle = wash;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Shrink the type until the widest line fits.
  let size = LINE_PX * 0.72;
  const fits = () => {
    ctx.font = `${size}px ${family}`;
    return lines.every((l) => ctx.measureText(l).width <= w * 0.86);
  };
  while (!fits() && size > 40) size -= 6;

  const core = mixWithWhite(color, 0.4);
  lines.forEach((line, i) => {
    const y = (i + 0.5) * (h / lines.length);
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.shadowBlur = 48;
    ctx.fillText(line, w / 2, y);
    ctx.shadowBlur = 18;
    ctx.fillText(line, w / 2, y);
    ctx.shadowBlur = 6;
    ctx.fillStyle = core;
    ctx.fillText(line, w / 2, y);
  });
  ctx.shadowBlur = 0;
  panel.texture.needsUpdate = true;
}

function makePanel(kit: MeshKit, lines: string[]): SignPanel {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH_PX;
  canvas.height = LINE_PX * lines.length;
  const texture = kit.texture(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const material = kit.track(new MeshBasicMaterial({ map: texture, transparent: true, opacity: SIGN_OPACITY, depthWrite: false, toneMapped: false, fog: false }));
  const mesh = new Mesh(kit.geo("sign-plane", () => new PlaneGeometry(1, 1)), material);
  mesh.position.z = WALL_Z + 0.06;
  mesh.visible = false;
  mesh.renderOrder = 1;
  return { mesh, material, canvas, texture, lines, aspect: canvas.width / canvas.height };
}

/**
 * The arcade's back wall with the game's name as a cursive neon sign. On wide
 * screens the name sits either side of the cabinet ("Bea's Claw-some" on the
 * left, "Adventure" on the right); on tall screens it sits on one line in the
 * space above the marquee. The renderer decides which and where (see ClawRenderer.layoutSign).
 */
export class WallSign {
  readonly wall: Mesh;
  readonly left: SignPanel;
  readonly right: SignPanel;
  readonly top: SignPanel;
  private readonly wallMat: MeshStandardMaterial;
  private color = "#FFD54D";
  private family = "cursive";

  constructor(kit: MeshKit, title: string) {
    this.wallMat = kit.track(new MeshStandardMaterial({ color: "#1F1840", roughness: 1 }));
    this.wall = new Mesh(kit.box(90, 40, 0.2), this.wallMat);
    this.wall.position.set(0, 18, WALL_Z - 0.1);

    // "Bea's Claw-some Adventure" -> ["Bea's Claw-some", "Adventure"] for the side panels.
    const words = title.split(" ");
    const head = words.slice(0, -1).join(" ");
    const tail = words[words.length - 1];
    this.left = makePanel(kit, head.split(" "));
    this.right = makePanel(kit, [tail]);
    // The band above the marquee is wide and short, where one line reads bigger than two.
    this.top = makePanel(kit, [title]);
  }

  addTo(parent: Group | { add: (...o: Mesh[]) => void }): void {
    parent.add(this.wall, this.left.mesh, this.right.mesh, this.top.mesh);
  }

  /** Repaints the sign in a world's colours. */
  setPalette(glow: string, sky: string): void {
    this.color = `#${new Color(glow).getHexString()}`;
    this.wallMat.color.set(sky).offsetHSL(0, 0.02, 0.05);
    this.redraw();
  }

  /** Repaints with a (newly loaded) font family. */
  setFont(family: string): void {
    this.family = family || "cursive";
    this.redraw();
  }

  setLayout(layout: SignLayout): void {
    this.left.mesh.visible = layout === "sides";
    this.right.mesh.visible = layout === "sides";
    this.top.mesh.visible = layout === "top";
  }

  /** Gentle "breathing" glow; flat when reduced motion is on. */
  update(time: number, calm: boolean): void {
    const k = calm ? 1 : 0.9 + 0.1 * Math.sin(time * 1.1);
    for (const p of [this.left, this.right, this.top]) p.material.opacity = SIGN_OPACITY * k;
  }

  private redraw(): void {
    for (const p of [this.left, this.right, this.top]) drawNeon(p, this.color, this.family);
  }
}
