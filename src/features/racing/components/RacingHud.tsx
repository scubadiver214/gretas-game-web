"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { RaceEngine } from "../engine/RaceEngine";
import type { WeaponKind } from "../types";
import { useRacingSettings } from "../settings";
import { useRacingHud, type BannerTone } from "../useRacingHud";
import { readClock, readSpeed } from "./format";
import LiveText from "./LiveText";
import Minimap from "./Minimap";
import { R, bigText, plate } from "./hudStyle";

const BANNER_COLORS: Record<BannerTone, string> = { gold: R.goldLight, blue: "#8fd0ff", pink: "#ff9ccc", green: "#7dff9a", red: "#ff7a72" };

/** A gold-framed label with its value underneath, like the reference's Lap / Rank / Time / Speed. */
function Plate({ label, children, align = "left", compact }: { label: string; children: ReactNode; align?: "left" | "right"; compact?: boolean }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: compact ? 74 : 124 }}>
      <Box sx={{ ...plate, px: compact ? 1 : 1.6, py: compact ? 0.15 : 0.35, display: "inline-block", minWidth: "100%" }}>
        <Typography sx={{ ...bigText, fontSize: compact ? "0.95rem" : "clamp(1.05rem, 2.4vmin, 1.5rem)", color: R.goldLight, textShadow: "0 2px 0 rgba(0,0,0,0.5)" }}>{label}</Typography>
      </Box>
      <Typography sx={{ ...bigText, fontSize: compact ? "1.15rem" : "clamp(1.2rem, 2.9vmin, 1.8rem)", mt: compact ? 0.15 : 0.4, textAlign: align === "right" ? "center" : "center" }}>{children}</Typography>
    </Box>
  );
}

function CoinIcon({ size }: { size: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "radial-gradient(circle at 35% 30%, #fff3a6, #ffc21f 55%, #d98c00)",
        border: "2px solid #b97a06",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        color: "#b97a06",
        fontSize: size * 0.58,
        boxShadow: "0 2px 0 rgba(0,0,0,0.35)",
      }}
    >
      ★
    </Box>
  );
}

function GemIcon({ size }: { size: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size * 1.1,
        height: size,
        flexShrink: 0,
        clipPath: "polygon(50% 0, 100% 34%, 50% 100%, 0 34%)",
        background: "linear-gradient(135deg, #ff7a9c 0%, #e5173f 55%, #a30d2a 100%)",
        filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.35))",
      }}
    />
  );
}

function Counter({ icon, value, label, size }: { icon: ReactNode; value: number; label: string; size: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }} aria-label={`${value} ${label}`}>
      {icon}
      <Typography
        key={value}
        sx={{ ...bigText, fontSize: `${size * 0.9}px`, minWidth: size, animation: value > 0 ? "racingBump 220ms ease-out" : undefined, "@keyframes racingBump": { from: { transform: "scale(1.45)" }, to: { transform: "scale(1)" } } }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function BoostMeter({ compact }: { compact?: boolean }) {
  const boost = useRacingHud((s) => s.boost);
  const boosting = useRacingHud((s) => s.boosting);
  const ready = boost >= 0.12;
  const w = compact ? 150 : 230;
  return (
    <Box aria-label={`Boost ${Math.round(boost * 100)} percent`} role="progressbar" aria-valuenow={Math.round(boost * 100)} sx={{ width: w }}>
      <Box sx={{ ...plate, p: "4px", borderRadius: "999px", position: "relative", animation: ready && !boosting ? "racingReady 900ms ease-in-out infinite" : undefined, "@keyframes racingReady": { "50%": { boxShadow: `0 0 18px ${R.orange}, 0 3px 0 rgba(0,0,0,0.35)` } } }}>
        <Box sx={{ height: compact ? 16 : 22, borderRadius: "999px", bgcolor: "rgba(0,0,0,0.45)", overflow: "hidden" }}>
          <Box sx={{ width: `${boost * 100}%`, height: "100%", borderRadius: "999px", background: boosting ? "linear-gradient(90deg,#ffd23f,#fff4b0)" : `linear-gradient(90deg, ${R.orange}, ${R.yellow})`, transition: "width 90ms linear" }} />
        </Box>
        <Typography sx={{ ...bigText, position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: compact ? "0.75rem" : "0.9rem", letterSpacing: "0.08em" }}>
          {boosting ? "BOOSTING!" : ready ? (compact ? "BOOST" : "BOOST  ·  SHIFT") : "BOOST"}
        </Typography>
      </Box>
    </Box>
  );
}

function Countdown({ n }: { n: number }) {
  const go = n === 0;
  const lit = go ? 3 : 4 - n;
  const color = go ? R.green : n === 1 ? R.yellow : R.red;
  return (
    <Box sx={{ position: "absolute", left: 0, right: 0, top: "16%", display: "grid", justifyItems: "center", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 1.2, p: 1, ...plate, borderRadius: "999px" }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: i < lit ? color : "rgba(255,255,255,0.14)", boxShadow: i < lit ? `0 0 14px ${color}` : "none", transition: "background-color 120ms" }} />
        ))}
      </Box>
      <Typography
        key={n}
        sx={{
          ...bigText,
          fontSize: "clamp(4.5rem, 20vmin, 11rem)",
          color,
          WebkitTextStroke: "6px rgba(40,22,0,0.75)",
          paintOrder: "stroke fill",
          animation: "racingPop 700ms cubic-bezier(.2,1.5,.4,1)",
          "@keyframes racingPop": { from: { transform: "scale(1.9)", opacity: 0 }, "40%": { opacity: 1 }, to: { transform: "scale(1)" } },
        }}
      >
        {go ? "GO!" : n}
      </Typography>
    </Box>
  );
}

function Banner() {
  const banner = useRacingHud((s) => s.banner);
  if (!banner) return null;
  const color = BANNER_COLORS[banner.tone];
  return (
    <Typography
      key={banner.id}
      aria-live="polite"
      sx={{
        ...bigText,
        position: "absolute",
        left: 0,
        right: 0,
        top: "27%",
        textAlign: "center",
        fontSize: "clamp(1.6rem, 6.5vmin, 3.4rem)",
        color,
        WebkitTextStroke: "5px rgba(40,22,0,0.7)",
        paintOrder: "stroke fill",
        opacity: 0,
        animation: "racingBanner 1500ms ease-out",
        "@keyframes racingBanner": { "0%": { opacity: 0, transform: "scale(0.6)" }, "12%": { opacity: 1, transform: "scale(1.12)" }, "22%": { transform: "scale(1)" }, "75%": { opacity: 1 }, "100%": { opacity: 0, transform: "translateY(-14px)" } },
      }}
    >
      {banner.text}
    </Typography>
  );
}

const corner: SxProps<Theme> = { position: "absolute", display: "flex", flexDirection: "column", gap: 1.1 };

const WEAPON_LABEL: Record<WeaponKind, string> = { gun: "GUN", mine: "MINE", oil: "OIL" };
const WEAPON_TINT: Record<WeaponKind, string> = { gun: "#ffb020", mine: "#ff5a5a", oil: "#7eb6ff" };

/** The three weapons and how many charges of each you are holding. The selected one is lit. */
function WeaponTray({ touch }: { touch: boolean }) {
  const weapon = useRacingHud((s) => s.weapon);
  const gun = useRacingHud((s) => s.gun);
  const gunSeconds = useRacingHud((s) => s.gunSeconds);
  const mine = useRacingHud((s) => s.mine);
  const oil = useRacingHud((s) => s.oil);
  const ammo: Record<WeaponKind, number> = { gun, mine, oil };
  return (
    <Box sx={{ position: "absolute", left: "50%", bottom: touch ? "auto" : "max(18px, env(safe-area-inset-bottom))", top: touch ? "max(58px, calc(env(safe-area-inset-top) + 48px))" : "auto", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 0.4 }}>
      <Box sx={{ display: "flex", gap: 0.7 }}>
        {(Object.keys(WEAPON_LABEL) as WeaponKind[]).map((kind, i) => {
          const on = weapon === kind;
          return (
            <Box key={kind} sx={{ ...plate, px: touch ? 0.7 : 1.1, py: 0.35, minWidth: touch ? 58 : 78, textAlign: "center", outline: on ? `3px solid ${WEAPON_TINT[kind]}` : "3px solid transparent", opacity: ammo[kind] > 0 || on || (kind === "gun" && gunSeconds > 0) ? 1 : 0.55 }}>
              <Typography sx={{ ...bigText, fontSize: touch ? "0.62rem" : "0.78rem", color: WEAPON_TINT[kind] }}>{WEAPON_LABEL[kind]}</Typography>
              <Typography sx={{ ...bigText, fontSize: touch ? "0.95rem" : "1.15rem", lineHeight: 1 }}>{kind === "gun" && gunSeconds > 0 ? `${gunSeconds}s` : ammo[kind]}</Typography>
              {!touch && <Typography sx={{ ...bigText, fontSize: "0.62rem", opacity: 0.7 }}>{i + 1}</Typography>}
            </Box>
          );
        })}
      </Box>
      {!touch && <Typography sx={{ ...bigText, fontSize: "0.72rem", opacity: 0.85 }}>Q E switch · F fire · gun lasts 10s</Typography>}
    </Box>
  );
}

/**
 * The racing HUD, laid out like the reference: coins and gems top left, lap and rank
 * down the left, clock and speed top right, the track map bottom left and the boost
 * meter bottom right. Ticking numbers are live text (no React renders per frame).
 */
export default function RacingHud({ engine, touch, colors }: { engine: RaceEngine; touch: boolean; colors: readonly string[] }) {
  const coins = useRacingHud((s) => s.coins);
  const gems = useRacingHud((s) => s.gems);
  const lap = useRacingHud((s) => s.lap);
  const laps = useRacingHud((s) => s.laps);
  const rank = useRacingHud((s) => s.rank);
  const racers = useRacingHud((s) => s.racers);
  const countdown = useRacingHud((s) => s.countdown);
  const wrongWay = useRacingHud((s) => s.wrongWay);
  const stuck = useRacingHud((s) => s.stuck);
  const crashed = useRacingHud((s) => s.crashed);
  const simple = useRacingSettings((s) => s.simpleHud);
  const iconSize = touch ? 24 : 34;

  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none" }}>
      <Box sx={{ ...corner, top: "max(12px, env(safe-area-inset-top))", left: "max(14px, env(safe-area-inset-left))" }}>
        <Box sx={{ display: "flex", gap: touch ? 1.4 : 2.2, alignItems: "center" }}>
          <Counter icon={<CoinIcon size={iconSize} />} value={coins} label="coins" size={iconSize} />
          <Counter icon={<GemIcon size={iconSize} />} value={gems} label="gems" size={iconSize} />
        </Box>
        <Plate label="Lap" compact={touch}>
          {lap} OF {laps}
        </Plate>
        {racers > 1 && (
          <Plate label="Rank" compact={touch}>
            {rank}/{racers}
          </Plate>
        )}
      </Box>

      {!simple && (
        <Box sx={{ ...corner, top: "max(12px, env(safe-area-inset-top))", right: touch ? "max(150px, calc(env(safe-area-inset-right) + 150px))" : "max(14px, env(safe-area-inset-right))", alignItems: "center" }}>
          <Plate label="Time" compact={touch}>
            <LiveText engine={engine} read={readClock} />
          </Plate>
          {!touch && (
            <Plate label="Speed">
              <LiveText engine={engine} read={readSpeed} />
            </Plate>
          )}
        </Box>
      )}
      {(simple || touch) && (
        <Box sx={{ ...corner, bottom: touch ? "auto" : 22, top: touch ? "max(12px, env(safe-area-inset-top))" : "auto", left: touch ? "50%" : "50%", transform: "translateX(-50%)", alignItems: "center" }}>
          {touch && !simple && (
            <Typography sx={{ ...bigText, fontSize: "1.1rem" }}>
              <LiveText engine={engine} read={readSpeed} />
            </Typography>
          )}
          {simple && !touch && (
            <Typography sx={{ ...bigText, fontSize: "2rem" }}>
              <LiveText engine={engine} read={readSpeed} />
            </Typography>
          )}
        </Box>
      )}

      {!simple && (
        <Box sx={{ position: "absolute", left: touch ? "max(12px, env(safe-area-inset-left))" : "max(16px, env(safe-area-inset-left))", bottom: touch ? "auto" : "max(16px, env(safe-area-inset-bottom))", top: touch ? "46%" : "auto" }}>
          <Minimap engine={engine} size={touch ? 92 : 168} colors={colors} />
        </Box>
      )}

      {!touch && (
        <Box sx={{ position: "absolute", right: "max(18px, env(safe-area-inset-right))", bottom: "max(20px, env(safe-area-inset-bottom))" }}>
          <BoostMeter />
        </Box>
      )}
      <WeaponTray touch={touch} />

      {countdown !== null && <Countdown n={countdown} />}
      <Banner />

      {crashed && (
        <Typography
          sx={{
            ...bigText,
            position: "absolute",
            left: 0,
            right: 0,
            top: "34%",
            textAlign: "center",
            fontSize: "clamp(2rem, 8vmin, 4.2rem)",
            color: "#ffb020",
            WebkitTextStroke: "7px rgba(40,22,0,0.8)",
            paintOrder: "stroke fill",
            animation: "racingCrash 420ms ease-in-out infinite alternate",
            "@keyframes racingCrash": { from: { transform: "scale(1) rotate(-2deg)" }, to: { transform: "scale(1.06) rotate(2deg)" } },
          }}
        >
          CRASH!
        </Typography>
      )}
      {wrongWay && !crashed && (
        <Typography
          sx={{
            ...bigText,
            position: "absolute",
            left: 0,
            right: 0,
            top: "36%",
            textAlign: "center",
            fontSize: "clamp(1.8rem, 7vmin, 3.6rem)",
            color: "#ff6b63",
            WebkitTextStroke: "6px rgba(40,22,0,0.75)",
            paintOrder: "stroke fill",
            animation: "racingFlash 600ms ease-in-out infinite alternate",
            "@keyframes racingFlash": { from: { opacity: 1, transform: "scale(1)" }, to: { opacity: 0.55, transform: "scale(1.06)" } },
          }}
        >
          ⛔ WRONG WAY! Turn around!
        </Typography>
      )}
      {stuck && !wrongWay && (
        <Typography sx={{ ...bigText, position: "absolute", left: 0, right: 0, bottom: "22%", textAlign: "center", fontSize: "clamp(1.2rem, 4.2vmin, 2.2rem)", WebkitTextStroke: "4px rgba(40,22,0,0.7)", paintOrder: "stroke fill" }}>
          Stuck? {touch ? "Tap ↻ to reset" : "Press R to reset"}
        </Typography>
      )}
    </Box>
  );
}
