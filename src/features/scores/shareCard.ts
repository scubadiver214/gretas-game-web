"use client";

import { N } from "@/design/neon";
import { CHARACTER_LABELS, MODE_LABELS, type CharacterId, type GameMode } from "@/features/player/types";

export interface ShareCardInput {
  nickname: string;
  character: CharacterId;
  color: string;
  mode: GameMode;
  score: number;
  stars: number;
  level: number;
  rank?: number;
  personalBest?: boolean;
  challengeDate?: string;
}

const W = 1080;
const H = 1080;

// Neon mode accents, matching the adventure cards in the hub.
const MODE_FILL: Record<GameMode, string> = { kitchen: N.kitchen, delivery: N.delivery, wordle: N.wordle, frogger: N.frogger, claw: N.claw };
const MODE_DEEP: Record<GameMode, string> = { kitchen: N.kitchenDeep, delivery: N.deliveryDeep, wordle: N.wordleDeep, frogger: N.froggerDeep, claw: N.clawDeep };

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Draws a square social-style results card and returns it as a PNG blob. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const font = '"Baloo 2", "Nunito", "Avenir Next", "Segoe UI", system-ui, sans-serif';

  g.fillStyle = N.bg;
  g.fillRect(0, 0, W, H);

  // Confetti dots.
  const colors = [N.sun, N.white, N.brand, N.delivery, N.pop];
  let seed = input.score + 17;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 70; i++) {
    g.fillStyle = colors[i % colors.length];
    g.globalAlpha = 0.5 + rnd() * 0.4;
    g.beginPath();
    g.arc(rnd() * W, rnd() * H, 6 + rnd() * 14, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // Card.
  roundRect(g, 80, 140, W - 160, H - 280, 72);
  g.fillStyle = N.panel;
  g.fill();

  g.textAlign = "center";
  g.fillStyle = N.textSoft;
  g.font = `800 40px ${font}`;
  g.fillText(input.challengeDate ? `Daily challenge · ${MODE_LABELS[input.mode]}` : MODE_LABELS[input.mode], W / 2, 230);

  // Avatar.
  g.beginPath();
  g.arc(W / 2, 360, 84, 0, Math.PI * 2);
  g.fillStyle = input.color;
  g.fill();
  g.fillStyle = N.white;
  g.font = `900 84px ${font}`;
  g.fillText(input.nickname.slice(0, 1).toUpperCase(), W / 2, 392);

  g.fillStyle = N.text;
  g.font = `900 64px ${font}`;
  g.fillText(`${input.nickname} as ${CHARACTER_LABELS[input.character]}`, W / 2, 520);

  // Extruded score, same treatment as the results screen.
  g.font = `900 220px ${font}`;
  g.fillStyle = MODE_DEEP[input.mode];
  g.fillText(String(input.score), W / 2, 752);
  g.fillStyle = MODE_FILL[input.mode];
  g.fillText(String(input.score), W / 2, 740);

  // Stars.
  const starY = 810;
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i < input.stars ? N.sun : N.panelEdge;
    g.font = `900 72px ${font}`;
    g.fillText("★", W / 2 + (i - 1) * 90, starY + 26);
  }

  g.fillStyle = N.textSoft;
  g.font = `800 40px ${font}`;
  const bits = [`Level ${input.level}`];
  if (input.rank) bits.push(`Rank #${input.rank}`);
  if (input.personalBest) bits.push("New personal best!");
  g.fillText(bits.join("  ·  "), W / 2, 890);

  g.fillStyle = N.text;
  g.font = `900 44px ${font}`;
  g.fillText("Greta's Game for fun 🍕", W / 2, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

/** Share via the Web Share API when possible, otherwise download the PNG. */
export async function shareResult(input: ShareCardInput): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(input);
  const file = new File([blob], `gretas-game-${input.mode}-${input.score}.png`, { type: "image/png" });
  const text = `I scored ${input.score} in ${MODE_LABELS[input.mode]} on Greta's Game for fun! 🍕`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "Greta's Game for fun" });
      return "shared";
    } catch {
      // user cancelled or share failed; fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
