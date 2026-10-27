"use client";

import { useId } from "react";
import { seededRng } from "@/lib/rng";
import { catalog } from "../game-data/catalog";
import { describeCreation } from "../logic/rank";
import type { Container, CurrentCreation, Flavor, MixStyle } from "../types";

interface Spot {
  cx: number;
  cy: number;
  r: number;
  index: number;
  mode: "ball" | "swirl" | "half" | "layers";
}

function spots(mix: MixStyle, count: number, seatY: number): Spot[] {
  if (count <= 0) return [];
  const ball = (cy: number, r: number, index: number): Spot => ({ cx: 160, cy, r, index, mode: "ball" });
  if (mix === "swirl" && count >= 2) return [{ cx: 160, cy: seatY - 20, r: 78, index: 0, mode: "swirl" }];
  if (mix === "half" && count >= 2) return [{ cx: 160, cy: seatY - 20, r: 78, index: 0, mode: "half" }];
  if (mix === "layered") return [{ cx: 160, cy: seatY - 6, r: 82, index: 0, mode: "layers" }];
  if (mix === "crazy") {
    const layout = [
      { cx: 116, cy: seatY + 4, r: 48 },
      { cx: 200, cy: seatY - 6, r: 46 },
      { cx: 156, cy: seatY - 72, r: 44 },
      { cx: 158, cy: seatY - 130, r: 34 },
    ];
    return layout.slice(0, count).map((spot, index) => ({ ...spot, index, mode: "ball" as const }));
  }
  if (count === 1) return [ball(seatY - 22, 74, 0)];
  if (count === 2) return [ball(seatY, 66, 0), ball(seatY - 82, 58, 1)];
  return [ball(seatY + 8, 62, 0), ball(seatY - 62, 54, 1), ball(seatY - 128, 48, 2)];
}

function Cone({ container, clip }: { container: Container; clip: string }) {
  const rainbow = ["#ff8fab", "#ffd166", "#7debb5", "#7ad7ff", "#c084fc"];
  return (
    <g>
      <clipPath id={clip}>
        <path d="M98 308 L160 458 L222 308 Q160 334 98 308 Z" />
      </clipPath>
      <path d="M98 308 L160 458 L222 308 Q160 334 98 308 Z" fill={container.color} />
      <g clipPath={`url(#${clip})`}>
        {container.pattern === "waffle" &&
          Array.from({ length: 8 }, (_, i) => (
            <path key={i} d={`M${104 + i * 14} 300 L${150 + i * 8} 460`} stroke={container.accent} strokeWidth="3" opacity="0.55" />
          ))}
        {container.pattern === "sprinkles" &&
          ["#ff6fa5", "#7ad7ff", "#ffb15a", "#7debb5", "#c084fc"].map((color, i) => (
            <circle key={color} cx={120 + (i % 3) * 24} cy={330 + Math.floor(i / 3) * 28} r="5" fill={color} />
          ))}
        {container.pattern === "rainbow" && rainbow.map((color, i) => <rect key={color} x={100 + i * 24} y="300" width="24" height="170" fill={color} />)}
      </g>
      <path d="M98 308 Q160 334 222 308" fill="none" stroke={container.accent} strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}

function Cup({ container, clip }: { container: Container; clip: string }) {
  const scale = container.id === "small-cup" ? 0.86 : container.id === "large-cup" ? 1.06 : 1;
  const rainbow = ["#ff8fab", "#ffd166", "#7debb5", "#7ad7ff", "#c084fc"];
  return (
    <g transform={`translate(160 360) scale(${scale}) translate(-160 -360)`}>
      <clipPath id={clip}>
        <path d="M78 268 Q64 400 104 432 L216 432 Q256 400 242 268 Z" />
      </clipPath>
      <path d="M78 268 Q64 400 104 432 L216 432 Q256 400 242 268 Z" fill={container.color} />
      <g clipPath={`url(#${clip})`}>
        {container.pattern === "stripes" && (
          <>
            <rect x="70" y="300" width="180" height="16" fill={container.accent} opacity="0.85" />
            <rect x="70" y="340" width="180" height="16" fill={container.accent} opacity="0.55" />
          </>
        )}
        {container.pattern === "rainbow" && rainbow.map((color, i) => <rect key={color} x={78 + i * 34} y="260" width="34" height="180" fill={color} />)}
        {container.pattern === "stars" &&
          ["#ffb15a", "#ff6fa5", "#7ad7ff", "#c084fc"].map((color, i) => (
            <circle key={color} cx={110 + (i % 2) * 70} cy={320 + Math.floor(i / 2) * 40} r="8" fill={color} />
          ))}
        {container.pattern === "logo" && (
          <>
            <circle cx="160" cy="350" r="22" fill="#ffb7d5" />
            <circle cx="152" cy="346" r="2.5" fill="#4a2c4a" />
            <circle cx="168" cy="346" r="2.5" fill="#4a2c4a" />
            <path d="M152 356 Q160 364 168 356" fill="none" stroke="#4a2c4a" strokeWidth="2" />
          </>
        )}
        {container.pattern === "mystery" && (
          <text x="160" y="360" textAnchor="middle" fontSize="42" fontFamily="var(--font-display), sans-serif" fill={container.accent}>
            ?
          </text>
        )}
      </g>
      <ellipse cx="160" cy="268" rx="84" ry="18" fill="#fff" stroke={container.accent} strokeWidth="4" />
    </g>
  );
}

function ScoopFill({ flavor, clip, uid }: { flavor: Flavor; clip: string; uid: string }) {
  const rng = seededRng(flavor.id);
  const bits = flavor.texture === "smooth" ? 0 : flavor.texture === "chips" || flavor.texture === "speckle" ? 14 : 8;
  return (
    <g clipPath={`url(#${clip})`}>
      <rect x="0" y="0" width="320" height="480" fill={flavor.color} />
      {flavor.texture === "swirl" && (
        <>
          <path d={`M0 0 H320 V480 H0 Z`} fill={flavor.color} />
          <path d="M40 80 C120 140 80 220 160 260 C240 300 200 380 300 440" stroke={flavor.textureColor} strokeWidth="28" fill="none" />
          {flavor.accent && <path d="M20 140 C100 180 90 250 170 290 C250 330 220 400 310 450" stroke={flavor.accent} strokeWidth="16" fill="none" />}
        </>
      )}
      {Array.from({ length: bits }, (_, i) => {
        const x = 40 + rng() * 240;
        const y = 40 + rng() * 400;
        const size = flavor.texture === "chunks" ? 10 : 4;
        return <circle key={`${uid}-${i}`} cx={x} cy={y} r={size} fill={flavor.textureColor} opacity="0.9" />;
      })}
    </g>
  );
}

function ScoopShape({ spot, flavors, uid, animate, delay }: { spot: Spot; flavors: Flavor[]; uid: string; animate: boolean; delay: string }) {
  const clip = `${uid}-s${spot.index}`;
  const flavor = flavors[Math.min(spot.index, flavors.length - 1)] ?? flavors[0];
  if (!flavor) return null;
  const motion = animate ? "scoop-drop" : undefined;
  return (
    <g className={motion} style={{ animationDelay: delay }}>
      <defs>
        <clipPath id={clip}>
          {spot.mode === "layers" ? (
            <ellipse cx={spot.cx} cy={spot.cy} rx={spot.r * 0.92} ry={spot.r * 1.05} />
          ) : (
            <circle cx={spot.cx} cy={spot.cy} r={spot.r} />
          )}
        </clipPath>
      </defs>
      {spot.mode === "ball" && <ScoopFill flavor={flavor} clip={clip} uid={clip} />}
      {spot.mode === "swirl" && (
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="320" height="480" fill={flavors[0]?.color ?? flavor.color} />
          <path d="M0 120 C80 80 100 200 180 180 C260 160 240 300 320 260 V480 H0 Z" fill={flavors[1]?.color ?? flavor.textureColor} />
          {flavors[2] && <path d="M0 220 C90 180 120 280 200 250 C270 230 260 340 320 320 V480 H0 Z" fill={flavors[2].color} opacity="0.95" />}
        </g>
      )}
      {spot.mode === "half" && (
        <g clipPath={`url(#${clip})`}>
          <rect x="0" y="0" width="160" height="480" fill={flavors[0]?.color ?? flavor.color} />
          <rect x="160" y="0" width="160" height="480" fill={flavors[1]?.color ?? flavor.textureColor} />
        </g>
      )}
      {spot.mode === "layers" && (
        <g clipPath={`url(#${clip})`}>
          {flavors.slice(0, 3).map((layer, index, all) => {
            const band = 220 / all.length;
            return <rect key={layer.id} x="40" y={spot.cy - 90 + index * band} width="240" height={band + 2} fill={layer.color} />;
          })}
        </g>
      )}
      <ellipse cx={spot.cx - spot.r * 0.28} cy={spot.cy - spot.r * 0.35} rx={spot.r * 0.28} ry={spot.r * 0.16} fill="#fff" opacity="0.45" />
      {flavor.specialAnimation === "glow" && (
        <circle cx={spot.cx} cy={spot.cy} r={spot.r + 3} fill="none" stroke={flavor.color} strokeWidth="6" opacity="0.35" />
      )}
      {flavor.specialAnimation === "sparkle" && animate && (
        <text x={spot.cx + spot.r * 0.45} y={spot.cy - spot.r * 0.55} fontSize="16">
          ✨
        </text>
      )}
    </g>
  );
}

interface IceCreamPreviewProps {
  creation: CurrentCreation;
  assembleKey?: number;
  animate?: boolean;
}

export function IceCreamPreview({ creation, assembleKey = 0, animate = true }: IceCreamPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const container = creation.containerId ? catalog.containerById.get(creation.containerId) : undefined;
  const flavors = creation.flavorIds.map((id) => catalog.flavorById.get(id)).filter((flavor): flavor is Flavor => Boolean(flavor));
  const seatY = !container ? 300 : container.serve === "cup" ? 250 : 300;
  const layout = spots(creation.mix, flavors.length, seatY);
  const top = layout.reduce<{ cy: number; r: number; cx: number } | null>((best, spot) => (!best || spot.cy < best.cy ? spot : best), null);
  const replay = assembleKey > 0 && animate;
  const wobble = animate && flavors.length >= 3;

  return (
    <svg viewBox="0 0 320 480" role="img" aria-label={describeCreation(creation)}>
      <ellipse cx="160" cy="452" rx="70" ry="12" fill="#e7c2a4" opacity="0.45" />
      {container?.serve === "cone" && <Cone container={container} clip={`${uid}-cone`} />}
      {container?.serve === "cup" && <Cup container={container} clip={`${uid}-cup`} />}
      {!container && <ellipse cx="160" cy="360" rx="78" ry="16" fill="#fff" stroke="#f0d2b0" strokeWidth="4" />}
      <g key={assembleKey} className={wobble ? "scoop-wobble" : undefined}>
        {layout.map((spot) => (
          <ScoopShape key={`${spot.index}-${spot.mode}`} spot={spot} flavors={flavors} uid={uid} animate={replay || animate} delay={replay ? `${spot.index * 0.12}s` : "0s"} />
        ))}
        {creation.sauceIds.map((id, index) => {
          const sauce = catalog.sauceById.get(id);
          if (!sauce || !top) return null;
          const side = index % 2 === 0 ? -1 : 1;
          const stroke = sauce.color === "#FFF8F2" ? "#f3d7c2" : sauce.color;
          return (
            <path
              key={id}
              className={animate ? "sauce-draw" : undefined}
              d={`M ${top.cx + side * 10} ${top.cy - top.r * 0.2} Q ${top.cx + side * 36} ${top.cy + 20} ${top.cx + side * 18} ${top.cy + top.r + 30 + index * 8}`}
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.9"
            />
          );
        })}
        {top &&
          creation.toppingIds.flatMap((id) => {
            const topping = catalog.toppingById.get(id);
            if (!topping) return [];
            const count = topping.scatter === "dots" ? 10 : topping.scatter === "worms" ? 3 : 5;
            const rng = seededRng(id);
            return Array.from({ length: count }, (_, i) => {
              const angle = rng() * Math.PI;
              const dist = 10 + rng() * top.r * 0.65;
              const x = top.cx + Math.cos(angle) * dist * (i % 2 === 0 ? 1 : -1);
              const y = top.cy - Math.sin(angle) * dist * 0.75;
              return (
                <text key={`${id}-${i}`} x={x} y={y} fontSize={topping.scatter === "dots" ? 12 : 16} textAnchor="middle">
                  {topping.emoji}
                </text>
              );
            });
          })}
        {top && creation.extraIds.includes("whipped-cream") && (
          <g>
            <circle cx={top.cx - 16} cy={top.cy - top.r - 8} r="16" fill="#fff" />
            <circle cx={top.cx + 14} cy={top.cy - top.r - 6} r="14" fill="#fff" />
            <circle cx={top.cx} cy={top.cy - top.r - 22} r="14" fill="#fffaf5" />
          </g>
        )}
        {top && creation.extraIds.includes("cherry") && (
          <g>
            <circle cx={top.cx + 6} cy={top.cy - top.r - 36} r="10" fill="#e11d48" />
            <path d={`M ${top.cx + 8} ${top.cy - top.r - 44} q 10 -16 4 -22`} stroke="#3c7a3a" strokeWidth="3" fill="none" />
          </g>
        )}
        {top && creation.extraIds.includes("candle") && (
          <g>
            <rect x={top.cx - 4} y={top.cy - top.r - 48} width="8" height="28" rx="2" fill="#ffb15a" />
            <ellipse cx={top.cx} cy={top.cy - top.r - 54} rx="5" ry="7" fill="#ffd166" />
          </g>
        )}
        {top && creation.extraIds.includes("wafer") && (
          <rect x={top.cx + top.r * 0.2} y={top.cy - 10} width="54" height="16" rx="3" fill="#e6c48a" stroke="#c49a58" transform={`rotate(-18 ${top.cx} ${top.cy})`} />
        )}
        {top && creation.extraIds.includes("rainbow") && (
          <path d={`M ${top.cx - 36} ${top.cy - top.r - 10} Q ${top.cx} ${top.cy - top.r - 48} ${top.cx + 36} ${top.cy - top.r - 10}`} fill="none" stroke="#ff6fa5" strokeWidth="5" />
        )}
        {top &&
          creation.extraIds
            .filter((id) => !["whipped-cream", "cherry", "candle", "wafer", "rainbow"].includes(id))
            .map((id, index) => {
              const extra = catalog.extraById.get(id);
              if (!extra) return null;
              return (
                <text key={id} x={top.cx - 28 + index * 28} y={top.cy - top.r - 8} fontSize="22" textAnchor="middle">
                  {extra.emoji}
                </text>
              );
            })}
      </g>
    </svg>
  );
}
