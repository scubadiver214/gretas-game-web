"use client";

import { useId, useRef } from "react";
import { seededRng } from "@/lib/rng";
import { MOTION, sauceMotion } from "../animation/motionConfig";
import { highestSpot, pieceCount, saucePath, scatterPoints, seatYFor, spots } from "../animation/layout";
import { useDessertMotion, type MotionHud } from "../animation/useDessertMotion";
import { catalog } from "../game-data/catalog";
import { describeCreation } from "../logic/rank";
import type { Container, CurrentCreation, Flavor } from "../types";

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

function mixWhite(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const channel = (start: number) => parseInt(value.slice(start, start + 2), 16);
  const mix = (color: number) => Math.round(color + (255 - color) * amount).toString(16).padStart(2, "0");
  return `#${mix(channel(0))}${mix(channel(2))}${mix(channel(4))}`;
}

function CreamBase({ flavor, grad }: { flavor: Flavor; grad: string }) {
  return (
    <>
      <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={mixWhite(flavor.color, 0.22)} />
        <stop offset="55%" stopColor={flavor.color} />
        <stop offset="100%" stopColor={flavor.colorDeep} />
      </linearGradient>
      <rect x="0" y="0" width="320" height="480" fill={`url(#${grad})`} />
      <ellipse cx="160" cy="430" rx="130" ry="46" fill={flavor.colorDeep} opacity="0.28" />
    </>
  );
}

function FlavorDecor({ flavor, uid }: { flavor: Flavor; uid: string }) {
  const rng = seededRng(flavor.id);
  if (flavor.id === "superman") {
    return (
      <>
        <path d="M10 70 C 90 20, 70 150, 150 130 S 250 210, 330 180" stroke="#3B82F6" strokeWidth="30" fill="none" strokeLinecap="round" />
        <path d="M0 150 C 80 100, 90 210, 170 190 S 260 250, 330 300" stroke={flavor.textureColor} strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M20 230 C 110 180, 100 280, 190 270 S 270 330, 340 390" stroke={flavor.accent ?? "#FACC15"} strokeWidth="16" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (flavor.id === "blue-moon") {
    return (
      <>
        <path d="M20 120 C 100 70, 80 190, 170 170 S 250 230, 320 280" stroke="#E7F6FF" strokeWidth="22" fill="none" opacity="0.85" />
        <ellipse cx="120" cy="150" rx="36" ry="16" fill="#fff" opacity="0.45" transform="rotate(-24 120 150)" />
      </>
    );
  }
  if (flavor.id === "blueberry-cheesecake") {
    return (
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <ellipse key={`cake-${i}`} cx={70 + rng() * 180} cy={80 + rng() * 280} rx={14 + rng() * 10} ry={8 + rng() * 5} fill={flavor.textureColor} opacity="0.95" transform={`rotate(${rng() * 40} 160 220)`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <circle key={`berry-${i}`} cx={60 + rng() * 200} cy={70 + rng() * 300} r={4 + rng() * 3} fill="#3B2A8A" />
        ))}
      </>
    );
  }
  if (flavor.id === "fudge" || flavor.texture === "ripples") {
    return (
      <>
        <path d="M30 90 C 110 140, 90 200, 180 230 S 250 300, 300 360" stroke={flavor.textureColor} strokeWidth="16" fill="none" opacity="0.8" />
        <path d="M20 180 C 120 150, 100 250, 190 280 S 260 340, 320 400" stroke={flavor.colorDeep} strokeWidth="10" fill="none" opacity="0.7" />
      </>
    );
  }
  if (flavor.texture === "swirl") {
    return (
      <>
        <path d="M40 80 C120 140 80 220 160 260 C240 300 200 380 300 440" stroke={flavor.textureColor} strokeWidth="28" fill="none" />
        {flavor.accent && <path d="M20 140 C100 180 90 250 170 290 C250 330 220 400 310 450" stroke={flavor.accent} strokeWidth="16" fill="none" />}
      </>
    );
  }
  const bits = flavor.texture === "smooth" ? 0 : flavor.texture === "chips" || flavor.texture === "speckle" ? 14 : 8;
  const size = flavor.texture === "chunks" ? 10 : 4;
  return (
    <>
      {Array.from({ length: bits }, (_, i) => (
        <circle key={`${uid}-bit-${i}`} cx={40 + rng() * 240} cy={40 + rng() * 400} r={size} fill={flavor.textureColor} opacity="0.9" />
      ))}
    </>
  );
}

function ScoopFill({ flavor, clip, uid }: { flavor: Flavor; clip: string; uid: string }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <CreamBase flavor={flavor} grad={`${uid}-cream`} />
      <FlavorDecor flavor={flavor} uid={uid} />
    </g>
  );
}

function ScoopShape({ spot, flavors, uid, animate, live, delay }: { spot: { cx: number; cy: number; r: number; index: number; mode: "ball" | "swirl" | "half" | "layers" }; flavors: Flavor[]; uid: string; animate: boolean; live: boolean; delay: string }) {
  const clip = `${uid}-s${spot.index}`;
  const flavor = flavors[Math.min(spot.index, flavors.length - 1)] ?? flavors[0];
  if (!flavor) return null;
  return (
    <g data-scoop={spot.index} className={!live && animate ? "scoop-drop" : undefined} style={!live && animate ? { animationDelay: delay } : undefined}>
      <defs>
        <clipPath id={clip}>
          {spot.mode === "layers" ? (
            <ellipse cx={spot.cx} cy={spot.cy} rx={spot.r * 0.92} ry={spot.r * 1.02} />
          ) : (
            <ellipse cx={spot.cx} cy={spot.cy} rx={spot.r * 1.06} ry={spot.r * 0.9} />
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
      <ellipse
        cx={spot.cx}
        cy={spot.cy}
        rx={spot.mode === "layers" ? spot.r * 0.92 : spot.r * 1.06}
        ry={spot.mode === "layers" ? spot.r * 1.02 : spot.r * 0.9}
        fill="none"
        stroke={flavor.colorDeep}
        strokeWidth="3.5"
      />
      <ellipse cx={spot.cx - spot.r * 0.28} cy={spot.cy - spot.r * 0.32} rx={spot.r * 0.28} ry={spot.r * 0.14} fill="#fff" opacity="0.35" />
      {flavor.specialAnimation === "glow" && <circle cx={spot.cx} cy={spot.cy} r={spot.r + 3} fill="none" stroke={flavor.color} strokeWidth="6" opacity="0.35" />}
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
  /** Clock-driven melt and topping motion. Off for recipe cards and the saved reveal. */
  live?: boolean;
  onMotion?: (hud: MotionHud) => void;
}

export function IceCreamPreview({ creation, assembleKey = 0, animate = true, live = false, onMotion }: IceCreamPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const moving = live && animate;
  useDessertMotion(svgRef, moving, creation, assembleKey, onMotion);
  const container = creation.containerId ? catalog.containerById.get(creation.containerId) : undefined;
  const flavors = creation.flavorIds.map((id) => catalog.flavorById.get(id)).filter((flavor): flavor is Flavor => Boolean(flavor));
  const serve = container?.serve ?? "none";
  const layout = spots(creation.mix, flavors.length, seatYFor(serve));
  const top = highestSpot(layout);
  const replay = assembleKey > 0 && animate && !moving;
  const wobble = animate && !moving && flavors.length >= 3;

  return (
    <svg ref={svgRef} viewBox="0 0 320 480" role="img" aria-label={describeCreation(creation)}>
      <ellipse cx="160" cy="452" rx="70" ry="12" fill="#e7c2a4" opacity="0.45" />
      {container?.serve === "cone" && <Cone container={container} clip={`${uid}-cone`} />}
      {container?.serve === "cup" && <Cup container={container} clip={`${uid}-cup`} />}
      {!container && <ellipse cx="160" cy="360" rx="78" ry="16" fill="#fff" stroke="#f0d2b0" strokeWidth="4" />}
      {moving && (
        <>
          <ellipse data-puddle="0" cx="160" cy="450" rx="8" ry="4" fill="#f6e7c1" opacity="0" />
          <ellipse data-puddle="1" cx="176" cy="452" rx="6" ry="3" fill="#ffffff" opacity="0" />
        </>
      )}
      <g key={assembleKey} className={wobble ? "scoop-wobble" : undefined}>
        {layout.map((spot) => (
          <ScoopShape key={`${spot.index}-${spot.mode}`} spot={spot} flavors={flavors} uid={uid} animate={animate} live={moving} delay={replay ? `${spot.index * 0.12}s` : "0s"} />
        ))}
        <g data-crown>
          {creation.sauceIds.map((id, index) => {
            const sauce = catalog.sauceById.get(id);
            if (!sauce || !top) return null;
            const stroke = sauce.color === "#FFF8F2" ? "#f3d7c2" : sauce.color;
            const width = sauceMotion(id).width;
            return (
              <g key={id}>
                <path
                  data-sauce={id}
                  className={!moving && animate ? "sauce-draw" : undefined}
                  d={saucePath(top, index, 0)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  opacity="0.92"
                />
                {moving && <circle data-sauce-drop={id} r={Math.max(4, width * 0.38)} fill={stroke} opacity="0" />}
              </g>
            );
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
        {top &&
          creation.toppingIds.flatMap((id) => {
            const topping = catalog.toppingById.get(id);
            if (!topping) return [];
            const homes = scatterPoints(id, pieceCount(topping.scatter), top);
            const size = topping.scatter === "dots" ? 12 : 16;
            return homes.map((home, index) => (
              <text key={`${id}-${index}`} data-piece={`${id}-${index}`} x={home.x} y={home.y} fontSize={size} textAnchor="middle" dominantBaseline="central">
                {topping.emoji}
              </text>
            ));
          })}
      </g>
      {moving &&
        Array.from({ length: MOTION.maxDrips }, (_, index) => (
          <ellipse key={index} data-drip={index} cx="160" cy="220" rx="3" ry="6" fill="#fff" opacity="0" />
        ))}
    </svg>
  );
}
