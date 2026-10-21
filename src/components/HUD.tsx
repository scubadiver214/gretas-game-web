"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalPizzaRoundedIcon from "@mui/icons-material/LocalPizzaRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import VibrationRoundedIcon from "@mui/icons-material/VibrationRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import MusicOffRoundedIcon from "@mui/icons-material/MusicOffRounded";
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/features/settings/store";
import { fx, useJuice, type PopupTone } from "@/lib/fx";
import { N, textGlow } from "@/design/neon";
import CountPill from "@/components/ui/CountPill";
import Panel from "@/components/ui/Panel";

/** Score counter, top right. */
export function ScorePill({ score }: { score: number }) {
  return <CountPill icon={<LocalPizzaRoundedIcon />} value={score} tone="sun" label={`Score ${score}`} />;
}

export function TimerPill({ seconds }: { seconds: number }) {
  const left = Math.max(0, Math.ceil(seconds));
  return (
    <CountPill
      icon={<TimerRoundedIcon />}
      value={`${left}s`}
      tone="blue"
      urgent={left <= 10}
      label={`${left} seconds left`}
    />
  );
}

export function QuitButton({ onQuit }: { onQuit: () => void }) {
  return (
    <IconButton aria-label="Quit game" onClick={onQuit} sx={{ width: 46, height: 46 }}>
      <CloseRoundedIcon />
    </IconButton>
  );
}

/** X on a pre-game card. Leaves the round before it starts and returns to the shop. */
export function BackToShopButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      aria-label="Back to shop"
      onClick={onClick}
      sx={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1,
        width: 40,
        height: 40,
        color: N.text,
        bgcolor: N.bgRaise,
        border: `1px solid ${N.panelEdge}`,
        "&:hover": { bgcolor: N.panel },
      }}
    >
      <CloseRoundedIcon />
    </IconButton>
  );
}

const POPUP_COLORS: Record<PopupTone, string> = {
  good: N.brand,
  great: N.sun,
  bad: N.kitchen,
  neutral: N.text,
};

/**
 * Floating "+10" stickers anchored where the action happened. The dark stroke
 * around the glyphs keeps them legible over both bright 3D scenes and the
 * dark arcade screens.
 */
export function ScorePopups() {
  const popups = useJuice((s) => s.popups);
  return (
    <Box aria-live="polite" sx={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {popups.map((p) => (
        <Typography
          key={p.id}
          component="div"
          sx={{
            position: "absolute",
            left: `${Math.min(92, Math.max(8, p.x * 100))}%`,
            top: `${Math.min(85, Math.max(10, p.y * 100))}%`,
            transform: "translate(-50%, -50%)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: p.big ? "2.4rem" : "1.7rem",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            color: POPUP_COLORS[p.tone],
            WebkitTextStroke: `5px ${N.bg}`,
            paintOrder: "stroke fill",
            filter: `drop-shadow(0 0 10px ${POPUP_COLORS[p.tone]}80)`,
            animation: "popupRise 950ms cubic-bezier(.2,.8,.3,1) forwards",
            "@keyframes popupRise": {
              "0%": { opacity: 0, transform: "translate(-50%, -30%) scale(0.6)" },
              "15%": { opacity: 1, transform: "translate(-50%, -50%) scale(1.15)" },
              "30%": { transform: "translate(-50%, -55%) scale(1)" },
              "100%": { opacity: 0, transform: "translate(-50%, -140%) scale(0.95)" },
            },
          }}
        >
          {p.text}
        </Typography>
      ))}
    </Box>
  );
}

/** Brief full-screen tint on big moments (perfect bake, hit, power-up). */
export function FlashOverlay() {
  const flash = useJuice((s) => s.flash);
  if (!flash) return null;
  return (
    <Box
      key={flash.id}
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        bgcolor: flash.color,
        animation: "flashFade 380ms ease-out forwards",
        "@keyframes flashFade": { from: { opacity: 1 }, to: { opacity: 0 } },
      }}
    />
  );
}

/** Streak counter that catches fire once a bonus is in range. */
export function ComboMeter({ combo, every }: { combo: number; every: number }) {
  if (combo < 1) return null;
  const toNext = combo % every;
  const pct = toNext === 0 ? 100 : (toNext / every) * 100;
  const hot = combo >= every;
  return (
    <Box
      key={combo}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        pl: 0.625,
        pr: 1.5,
        height: 46,
        borderRadius: 999,
        bgcolor: hot ? N.kitchen : N.panel,
        color: hot ? N.white : N.text,
        border: `1px solid ${hot ? N.kitchenDeep : N.panelEdge}`,
        boxShadow: hot ? `0 0 18px ${N.kitchen}80` : "0 4px 14px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-arcade)",
        fontWeight: 700,
        fontSize: "1.15rem",
        animation: "comboPop 260ms cubic-bezier(.2,1.6,.4,1)",
        "@keyframes comboPop": { from: { transform: "scale(1.2)" }, to: { transform: "scale(1)" } },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `conic-gradient(${hot ? N.sun : N.delivery} ${pct}%, ${hot ? "rgba(255,255,255,0.35)" : N.panelEdge} 0)`,
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            bgcolor: hot ? N.kitchen : N.panel,
            display: "grid",
            placeItems: "center",
          }}
        >
          <LocalFireDepartmentRoundedIcon sx={{ fontSize: 18, color: hot ? N.sun : N.delivery }} />
        </Box>
      </Box>
      <span className="tnum">x{combo}</span>
    </Box>
  );
}

/** Customer patience: a chunky bar with a mood face riding on the front. */
export function PatienceBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const color = value > 0.5 ? N.brand : value > 0.25 ? N.sun : N.kitchen;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          lineHeight: 1,
          bgcolor: color,
          boxShadow: `0 0 10px ${color}80`,
          animation: value <= 0.25 ? "faceShake 500ms ease-in-out infinite" : undefined,
          "@keyframes faceShake": {
            "0%,100%": { transform: "rotate(-8deg)" },
            "50%": { transform: "rotate(8deg)" },
          },
        }}
        aria-hidden
      >
        {value > 0.5 ? "😀" : value > 0.25 ? "😐" : "😡"}
      </Box>
      <Box
        role="progressbar"
        aria-label={label ?? "Customer patience"}
        aria-valuenow={Math.round(pct)}
        sx={{
          flex: 1,
          height: 16,
          borderRadius: 999,
          bgcolor: N.bgRaise,
          border: `1px solid ${N.panelEdge}`,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            bgcolor: color,
            boxShadow: `0 0 10px ${color}99`,
            transition: "width 120ms linear, background-color 300ms",
          }}
        />
      </Box>
    </Box>
  );
}

/** 3-2-1-Go countdown shown before a round starts. */
export function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      fx.go();
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    fx.tick();
    const t = setTimeout(() => setN((v) => v - 1), 800);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        bgcolor: "rgba(5,8,13,0.55)",
        pointerEvents: "none",
      }}
    >
      <Typography
        key={n}
        sx={{
          fontFamily: "var(--font-arcade)",
          fontWeight: 700,
          fontSize: "7rem",
          lineHeight: 1,
          color: n === 0 ? N.brand : N.text,
          textShadow: textGlow(n === 0 ? N.brand : N.delivery),
          animation: "pop 700ms ease-out",
          "@keyframes pop": { from: { transform: "scale(1.6)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
        }}
      >
        {n === 0 ? "GO!" : n}
      </Typography>
    </Box>
  );
}

export function IntroCard({
  title,
  badge,
  lines,
  cta,
  accent = N.delivery,
  onStart,
  onClose,
}: {
  title: string;
  /** Small chip under the title, e.g. the level or "Daily challenge". */
  badge?: string;
  lines: string[];
  cta: string;
  accent?: string;
  onStart: () => void;
  /** Leave before the round starts. */
  onClose?: () => void;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: "rgba(5,8,13,0.72)",
        zIndex: 2,
      }}
    >
      <Panel accent={accent} padding={2.5} sx={{ maxWidth: 400, width: "100%" }}>
        {onClose && <BackToShopButton onClick={onClose} />}
        <Stack spacing={1.5}>
          <Box sx={{ textAlign: "center", px: onClose ? 4 : 0 }}>
            <Typography
              variant="h2"
              component="h2"
              sx={{ color: accent, textShadow: `0 0 12px ${accent}66` }}
            >
              {title}
            </Typography>
            {badge && (
              <Chip label={badge} sx={{ mt: 0.75, bgcolor: accent, color: N.bg, fontWeight: 700 }} />
            )}
          </Box>
          <Stack component="ul" spacing={0.75} sx={{ listStyle: "none", m: 0, p: 0 }}>
            {lines.map((l) => (
              <Stack key={l} component="li" direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <Box
                  aria-hidden
                  sx={{
                    mt: "4px",
                    width: 9,
                    height: 9,
                    flexShrink: 0,
                    borderRadius: "50%",
                    bgcolor: accent,
                    boxShadow: `0 0 8px ${accent}99`,
                  }}
                />
                <Typography sx={{ fontSize: "1.02rem", lineHeight: 1.35, color: N.text }}>{l}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button size="large" fullWidth variant="contained" color="success" onClick={onStart}>
            {cta}
          </Button>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <SettingsToggles />
          </Box>
        </Stack>
      </Panel>
    </Box>
  );
}

/** Sound + music + haptics toggles; safe to render anywhere. */
export function SettingsToggles({ size = "medium" }: { size?: "small" | "medium" }) {
  const soundOn = useSettingsStore((s) => s.soundOn);
  const musicOn = useSettingsStore((s) => s.musicOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleMusic = useSettingsStore((s) => s.toggleMusic);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);
  const dim = size === "small" ? 36 : 42;
  const on = (active: boolean) =>
    ({
      width: dim,
      height: dim,
      bgcolor: N.panel,
      color: active ? N.brand : N.textSoft,
      border: `1px solid ${active ? `${N.brand}80` : N.panelEdge}`,
      boxShadow: active ? `0 0 10px ${N.brand}40` : undefined,
      "&:hover": { bgcolor: N.bgRaise },
    }) as const;
  return (
    <Stack direction="row" spacing={0.75}>
      <IconButton
        aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
        aria-pressed={soundOn}
        onClick={() => {
          toggleSound();
          if (!soundOn) fx.unlock();
        }}
        sx={on(soundOn)}
      >
        {soundOn ? <VolumeUpRoundedIcon /> : <VolumeOffRoundedIcon />}
      </IconButton>
      <IconButton
        aria-label={musicOn ? "Turn music off" : "Turn music on"}
        aria-pressed={musicOn}
        disabled={!soundOn}
        onClick={() => {
          toggleMusic();
          if (!musicOn) fx.unlock();
        }}
        sx={on(musicOn && soundOn)}
      >
        {musicOn ? <MusicNoteRoundedIcon /> : <MusicOffRoundedIcon />}
      </IconButton>
      <IconButton
        aria-label={hapticsOn ? "Turn vibration off" : "Turn vibration on"}
        aria-pressed={hapticsOn}
        onClick={toggleHaptics}
        sx={on(hapticsOn)}
      >
        <VibrationRoundedIcon sx={{ opacity: hapticsOn ? 1 : 0.45 }} />
      </IconButton>
    </Stack>
  );
}
