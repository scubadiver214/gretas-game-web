"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { SettingsToggles } from "@/components/HUD";
import { useSettingsStore } from "@/features/settings/store";
import { fx } from "@/lib/fx";
import { GAME_TITLE, type CameraDistance } from "../config";
import { ASSIST_LABELS, ASSIST_LEVELS, difficultyFor, type AssistLevel } from "../engine/difficulty";
import type { Rival } from "../rivals";
import { useRacingSettings, type RaceMode } from "../settings";
import { TRACKS } from "../world";
import type { TrackDefinition, WorldId } from "../world/track";
import { R, bigText, plate } from "./hudStyle";

const TILES = [
  { emoji: "🔧", label: "My Garage" },
  { emoji: "🦄", label: "Avatars" },
  { emoji: "🏆", label: "Trophies" },
] as const;

/** How each world looks on its card in the track picker. */
const WORLD_LOOK: Record<WorldId, { emoji: string; blurb: string; sky: string; ground: string }> = {
  desert: { emoji: "🌵", blurb: "Sun, dunes and jumps", sky: "#4f9be0", ground: "#e8b66a" },
  winter: { emoji: "⛄", blurb: "Snow, ice and snowstorms", sky: "#9cc3ea", ground: "#f2f8ff" },
  alpine: { emoji: "🏔️", blurb: "Green peaks and sunshine", sky: "#2f86f0", ground: "#5cbc4c" },
  beach: { emoji: "🏖️", blurb: "Sand, surf and downpours", sky: "#3cb4ee", ground: "#2aa6cf" },
  jungle: { emoji: "🦁", blurb: "Lions, tigers and giraffes", sky: "#78c2a0", ground: "#2f8a38" },
};

/** Phones held sideways are short: the extras give way to the title and the Play button. */
const SHORT = "@media (max-height: 520px)";

const outline = "drop-shadow(3px 0 0 #2b1d05) drop-shadow(-3px 0 0 #2b1d05) drop-shadow(0 3px 0 #2b1d05) drop-shadow(0 -3px 0 #2b1d05) drop-shadow(0 6px 4px rgba(0,0,0,0.4))";

function Title() {
  const line = (text: string, size: string, from: string, to: string) => (
    <Typography
      component="span"
      sx={{
        display: "block",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontStyle: "italic",
        fontSize: size,
        lineHeight: 0.92,
        letterSpacing: "0.01em",
        textTransform: "uppercase",
        transform: "skewX(-8deg)",
        background: `linear-gradient(180deg, #fff6b0 0%, ${from} 38%, ${to} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        filter: outline,
      }}
    >
      {text}
    </Typography>
  );
  return (
    <Typography component="h1" aria-label={GAME_TITLE} sx={{ m: 0 }}>
      {line("The Fitz", "clamp(2.6rem, 11vmin, 5rem)", "#ffd23f", "#ff8a1f")}
      {line("and Furious", "clamp(2.9rem, 12.5vmin, 5.6rem)", "#ff9a3d", "#e53935")}
    </Typography>
  );
}

function TrackPicker({ selected, onPick }: { selected: string; onPick: (id: string) => void }) {
  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ ...bigText, fontSize: "1rem", color: R.goldLight, mb: 0.5, textAlign: { xs: "center", md: "left" }, [SHORT]: { display: "none" } }}>Pick a track</Typography>
      <Box role="group" aria-label="Pick a track" sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
        {TRACKS.map((t) => {
          const look = WORLD_LOOK[t.world];
          const active = t.id === selected;
          return (
            <ButtonBase
              key={t.id}
              aria-pressed={active}
              aria-label={`${t.name}: ${look.blurb}`}
              onClick={() => {
                fx.tap();
                onPick(t.id);
              }}
              sx={{
                ...plate,
                flexDirection: "column",
                alignItems: "stretch",
                p: 0,
                overflow: "hidden",
                borderColor: active ? R.goldLight : "rgba(232,169,29,0.45)",
                transform: active ? "translateY(-3px)" : "none",
                boxShadow: active ? `0 0 0 3px ${R.goldLight}, 0 8px 14px rgba(0,0,0,0.4)` : plate.boxShadow,
                transition: "transform 120ms, box-shadow 120ms",
                "&:hover": { transform: "translateY(-3px)" },
                "&.Mui-focusVisible": { outline: `3px solid ${R.white}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ height: { xs: 44, md: 58 }, display: "grid", placeItems: "center", background: `linear-gradient(180deg, ${look.sky} 0%, ${look.sky} 55%, ${look.ground} 55%, ${look.ground} 100%)`, [SHORT]: { height: 32 } }}>
                <Typography sx={{ fontSize: { xs: 26, md: 32 }, lineHeight: 1, [SHORT]: { fontSize: 22 } }} aria-hidden>
                  {look.emoji}
                </Typography>
              </Box>
              <Box sx={{ px: 0.5, py: 0.6, textAlign: "center" }}>
                <Typography sx={{ ...bigText, fontSize: "0.82rem", lineHeight: 1.05 }}>{t.name}</Typography>
                <Typography sx={{ color: R.goldLight, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.7rem", [SHORT]: { display: "none" } }}>{look.blurb}</Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

const MODES: readonly { id: RaceMode; emoji: string; name: string; blurb: string }[] = [
  { id: "rivals", emoji: "🏁", name: "Race rivals", blurb: "Beat four racing cars" },
  { id: "timeTrial", emoji: "⏱️", name: "Time trial", blurb: "Just you and the clock" },
];

/** Race against the rival cars or drive alone against the clock, picked just before Play. */
function ModePicker({ mode, rivals, onPick }: { mode: RaceMode; rivals: readonly Rival[]; onPick: (m: RaceMode) => void }) {
  return (
    <Box sx={{ width: "100%" }}>
      <Box role="radiogroup" aria-label="How do you want to race?" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <ButtonBase
              key={m.id}
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (active) return;
                fx.tap();
                onPick(m.id);
              }}
              sx={{
                ...plate,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1,
                px: 1.2,
                py: 0.8,
                textAlign: "left",
                background: active ? `linear-gradient(180deg, ${R.goldLight}, ${R.gold})` : plate.background,
                borderColor: active ? R.goldLight : "rgba(232,169,29,0.45)",
                boxShadow: active ? `0 0 0 3px ${R.goldLight}, 0 6px 12px rgba(0,0,0,0.35)` : plate.boxShadow,
                transition: "box-shadow 120ms",
                "&.Mui-focusVisible": { outline: `3px solid ${R.white}`, outlineOffset: 2 },
              }}
            >
              <Typography sx={{ fontSize: 28, lineHeight: 1, [SHORT]: { fontSize: 22 } }} aria-hidden>
                {m.emoji}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ ...bigText, fontSize: "1.05rem", lineHeight: 1.1, color: active ? R.ink : R.white, textShadow: active ? "none" : bigText.textShadow }}>{m.name}</Typography>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.75rem", color: active ? R.ink : R.goldLight, [SHORT]: { display: "none" } }}>{m.blurb}</Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
      {mode === "rivals" && (
        <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", mt: 0.6, textAlign: { xs: "center", md: "left" }, textShadow: "0 1px 3px rgba(0,0,0,0.6)", [SHORT]: { display: "none" } }}>
          vs {rivals.map((r) => `${r.emoji} ${r.name}`).join("  ·  ")}
        </Typography>
      )}
    </Box>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; text: string }[]; onChange: (v: T) => void }) {
  return (
    <Box>
      <Typography sx={{ ...bigText, fontSize: "1rem", color: R.goldLight, mb: 0.5 }}>{label}</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={value}
        onChange={(_, v: T | null) => {
          if (v) {
            fx.tap();
            onChange(v);
          }
        }}
        aria-label={label}
        sx={{ "& .MuiToggleButton-root": { ...bigText, fontSize: "1rem", textTransform: "none", py: 0.9, border: `2px solid ${R.gold}`, color: R.white, bgcolor: "rgba(0,0,0,0.25)", "&.Mui-selected": { bgcolor: R.gold, color: R.ink, textShadow: "none" } } }}
      >
        {options.map((o) => (
          <ToggleButton key={o.id} value={o.id}>
            {o.text}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

export default function MainMenu({
  track,
  nickname,
  vehicleName,
  touch,
  mode,
  rivals,
  onPickMode,
  onPickTrack,
  onPlay,
  onQuit,
}: {
  track: TrackDefinition;
  nickname: string;
  vehicleName: string;
  touch: boolean;
  mode: RaceMode;
  rivals: readonly Rival[];
  onPickMode: (m: RaceMode) => void;
  onPickTrack: (id: string) => void;
  onPlay: () => void;
  onQuit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const assist = useRacingSettings((s) => s.assist);
  const setAssist = useRacingSettings((s) => s.setAssist);
  const cameraDistance = useRacingSettings((s) => s.cameraDistance);
  const setCameraDistance = useRacingSettings((s) => s.setCameraDistance);
  const simpleHud = useRacingSettings((s) => s.simpleHud);
  const setSimpleHud = useRacingSettings((s) => s.setSimpleHud);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const toggleReducedMotion = useSettingsStore((s) => s.toggleReducedMotion);
  const tier = difficultyFor(track.tier);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: { xs: "center", md: "flex-start" },
        overflowY: "auto",
        p: { xs: 1.5, md: 4 },
        pl: { md: 8 },
        background: { xs: "linear-gradient(180deg, rgba(20,12,0,0.5), rgba(20,12,0,0.15) 60%)", md: "linear-gradient(90deg, rgba(20,12,0,0.62) 0%, rgba(20,12,0,0.3) 45%, rgba(20,12,0,0) 70%)" },
      }}
    >
      <Stack spacing={{ xs: 1.4, md: 2 }} sx={{ width: "100%", maxWidth: 460, my: "auto", alignItems: { xs: "center", md: "stretch" } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
          <IconButton aria-label="Back to the arcade" onClick={onQuit} sx={{ width: 46, height: 46, ...plate, borderRadius: "50%" }}>
            <CloseRoundedIcon sx={{ color: R.white }} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <SettingsToggles size="small" />
        </Box>

        <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
          <Title />
          <Typography sx={{ ...bigText, fontSize: "1.1rem", mt: 1, color: R.goldLight }}>
            {track.name} · {track.laps} laps · {tier.name}
          </Typography>
        </Box>

        <Box sx={{ ...plate, px: 2, py: 1, display: "flex", alignItems: "center", gap: 1.5, width: "100%", [SHORT]: { display: "none" } }}>
          <Typography sx={{ fontSize: 34, lineHeight: 1 }} aria-hidden>
            🏎️
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...bigText, fontSize: "1.25rem" }} noWrap>
              {nickname}
            </Typography>
            <Typography sx={{ color: R.goldLight, fontFamily: "var(--font-display)", fontWeight: 700 }} noWrap>
              {vehicleName}
            </Typography>
          </Box>
        </Box>

        <TrackPicker selected={track.id} onPick={onPickTrack} />

        <ModePicker mode={mode} rivals={rivals} onPick={onPickMode} />

        <Button
          autoFocus
          fullWidth
          variant="contained"
          color="success"
          startIcon={<PlayArrowRoundedIcon sx={{ fontSize: "2.4rem !important" }} />}
          onClick={onPlay}
          sx={{
            ...bigText,
            fontSize: "2.2rem",
            py: 1.2,
            borderRadius: "20px",
            textTransform: "none",
            border: "4px solid #fff",
            boxShadow: "0 7px 0 #1c7a31, 0 12px 20px rgba(0,0,0,0.35)",
            animation: "racingPulse 1.6s ease-in-out infinite",
            "@keyframes racingPulse": { "50%": { transform: "scale(1.035)" } },
            "&:active": { transform: "translateY(4px)", boxShadow: "0 3px 0 #1c7a31" },
          }}
        >
          Play!
        </Button>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, width: "100%", [SHORT]: { display: "none" } }}>
          {TILES.map((t) => (
            <ButtonBase key={t.label} disabled aria-label={`${t.label}: coming soon`} sx={{ ...plate, flexDirection: "column", py: 1, px: 0.5, opacity: 0.7, position: "relative" }}>
              <Typography sx={{ fontSize: 26, lineHeight: 1, filter: "grayscale(0.4)" }} aria-hidden>
                {t.emoji}
              </Typography>
              <Typography sx={{ ...bigText, fontSize: "0.78rem", mt: 0.4 }}>{t.label}</Typography>
              <LockRoundedIcon sx={{ position: "absolute", top: 3, right: 3, fontSize: 14, color: R.goldLight }} />
            </ButtonBase>
          ))}
        </Box>
        <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem", mt: "-6px !important", textAlign: { xs: "center", md: "left" }, [SHORT]: { display: "none" } }}>More menus are coming soon!</Typography>

        <Button onClick={() => setOpen((o) => !o)} startIcon={<SettingsRoundedIcon />} aria-expanded={open} sx={{ ...bigText, textTransform: "none", fontSize: "1.1rem", alignSelf: { xs: "center", md: "flex-start" } }}>
          Settings
        </Button>
        <Collapse in={open} sx={{ width: "100%" }} unmountOnExit>
          <Stack spacing={1.5} sx={{ ...plate, p: 2 }}>
            <Choice<AssistLevel> label="How much help do you want?" value={assist} options={ASSIST_LEVELS.map((id) => ({ id, text: ASSIST_LABELS[id].name }))} onChange={setAssist} />
            <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", mt: "6px !important" }}>{ASSIST_LABELS[assist].blurb}</Typography>
            <Choice<CameraDistance>
              label="Camera"
              value={cameraDistance}
              options={[
                { id: "close", text: "Close" },
                { id: "normal", text: "Normal" },
                { id: "far", text: "Far" },
              ]}
              onChange={setCameraDistance}
            />
            <FormControlLabel control={<Switch checked={simpleHud} onChange={(_, v) => setSimpleHud(v)} />} label={<Typography sx={{ ...bigText, fontSize: "1rem" }}>Simple screen (hide clock and map)</Typography>} />
            <FormControlLabel control={<Switch checked={reducedMotion} onChange={toggleReducedMotion} />} label={<Typography sx={{ ...bigText, fontSize: "1rem" }}>Calm view (less shake)</Typography>} />
          </Stack>
        </Collapse>

        <Typography sx={{ color: "rgba(255,255,255,0.92)", fontSize: "0.95rem", textAlign: { xs: "center", md: "left" }, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
          {touch ? "Steer, GO, and tap FIRE. SWAP changes weapon." : "W A S D or arrows to drive · Q E or 1 2 3 weapons · F fires · Space drifts · Shift boosts · R resets · Esc pauses"}
        </Typography>
      </Stack>
    </Box>
  );
}
