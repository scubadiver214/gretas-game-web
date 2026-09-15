"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import VibrationRoundedIcon from "@mui/icons-material/VibrationRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/features/settings/store";
import { fx } from "@/lib/fx";

export function ScorePill({ score }: { score: number }) {
  return (
    <Chip
      icon={<StarRoundedIcon />}
      label={score}
      color="warning"
      sx={{ fontSize: "1.1rem", height: 40, px: 0.5, bgcolor: "#FDE68A", color: "#2B2D42" }}
    />
  );
}

export function TimerPill({ seconds }: { seconds: number }) {
  const urgent = seconds <= 10;
  return (
    <Chip
      icon={<TimerRoundedIcon />}
      label={`${Math.max(0, Math.ceil(seconds))}s`}
      sx={{
        fontSize: "1.1rem",
        height: 40,
        px: 0.5,
        bgcolor: urgent ? "#F2542D" : "#FFFFFF",
        color: urgent ? "#FFFFFF" : "#2B2D42",
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
}

export function QuitButton({ onQuit }: { onQuit: () => void }) {
  return (
    <IconButton
      aria-label="Quit game"
      onClick={onQuit}
      sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "#fff" } }}
    >
      <CloseRoundedIcon />
    </IconButton>
  );
}

/**
 * Floating "+10" style feedback that fades out. Parents pass a fresh `key`
 * per message so each toast mounts visible and then fades.
 */
export function FeedbackToast({ message, tone }: { message: string | null; tone: "good" | "bad" | "neutral" }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(t);
  }, []);
  if (!message) return null;
  const color = tone === "good" ? "#3FA34D" : tone === "bad" ? "#F2542D" : "#2B2D42";
  return (
    <Box
      aria-live="polite"
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "34%",
        textAlign: "center",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-24px) scale(1.15)",
        transition: "opacity 300ms ease, transform 500ms ease",
      }}
    >
      <Typography
        variant="h2"
        sx={{ color, textShadow: "0 3px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(0,0,0,0.15)" }}
      >
        {message}
      </Typography>
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
        bgcolor: "rgba(43,45,66,0.25)",
        pointerEvents: "none",
      }}
    >
      <Typography
        key={n}
        variant="h1"
        sx={{
          fontSize: "6rem",
          color: "#fff",
          textShadow: "0 6px 0 #F2542D",
          animation: "pop 700ms ease-out",
          "@keyframes pop": { from: { transform: "scale(1.6)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
        }}
      >
        {n === 0 ? "Go!" : n}
      </Typography>
    </Box>
  );
}

export function IntroCard({
  title,
  badge,
  lines,
  cta,
  onStart,
}: {
  title: string;
  /** Small chip under the title, e.g. the level or "Daily challenge". */
  badge?: string;
  lines: string[];
  cta: string;
  onStart: () => void;
}) {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(43,45,66,0.35)" }}>
      <Paper sx={{ p: 3, maxWidth: 380, width: "100%", borderRadius: 6, textAlign: "center" }}>
        <Typography variant="h2" gutterBottom={!badge}>
          {title}
        </Typography>
        {badge && <Chip label={badge} color="secondary" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />}
        {lines.map((l) => (
          <Typography key={l} sx={{ mb: 1, fontSize: "1.05rem" }}>
            {l}
          </Typography>
        ))}
        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
          <Button size="large" fullWidth variant="contained" onClick={onStart} sx={{ flex: 1 }}>
            {cta}
          </Button>
          <SettingsToggles />
        </Stack>
      </Paper>
    </Box>
  );
}

/** Sound + haptics toggles; safe to render anywhere. */
export function SettingsToggles({ size = "medium" }: { size?: "small" | "medium" }) {
  const soundOn = useSettingsStore((s) => s.soundOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);
  return (
    <Stack direction="row" spacing={0.5}>
      <IconButton
        size={size}
        aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
        aria-pressed={soundOn}
        onClick={() => {
          toggleSound();
          if (!soundOn) fx.unlock();
        }}
        sx={{ bgcolor: soundOn ? "#FDE68A" : "#F1E9DE" }}
      >
        {soundOn ? <VolumeUpRoundedIcon /> : <VolumeOffRoundedIcon />}
      </IconButton>
      <IconButton
        size={size}
        aria-label={hapticsOn ? "Turn vibration off" : "Turn vibration on"}
        aria-pressed={hapticsOn}
        onClick={toggleHaptics}
        sx={{ bgcolor: hapticsOn ? "#FDE68A" : "#F1E9DE" }}
      >
        <VibrationRoundedIcon sx={{ opacity: hapticsOn ? 1 : 0.45 }} />
      </IconButton>
    </Stack>
  );
}
