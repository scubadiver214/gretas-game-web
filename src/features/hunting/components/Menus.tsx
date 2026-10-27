"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import type { ReactNode } from "react";
import { SettingsToggles } from "@/components/HUD";
import { useSettingsStore } from "@/features/settings/store";
import { BADGES } from "../badges";
import { DIFFICULTIES, type AdaptiveBoost, type DifficultyPreset } from "../engine/difficulty";
import { LEVELS, WORLDS, isLevelUnlocked, objectiveText, type LevelDef } from "../levels";
import { starsByLevel, useHuntProgress } from "../progress";
import { RARITY_LABEL, SPECIES } from "../species";
import { GAME_TITLE } from "../config";
import { H, SHORT, bigButton, bigText, formatClock, menuCard } from "./hudStyle";

/** Full-screen layer over the live lake with a soft vignette behind the card. */
export function Screen({ children, align = "left", wide = false }: { children: ReactNode; align?: "left" | "center"; wide?: boolean }) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : "center",
        p: { xs: 1.5, sm: 3 },
        pl: align === "left" ? { xs: 1.5, sm: 5 } : undefined,
        background: align === "left" ? "linear-gradient(90deg, rgba(5,20,15,0.55), rgba(5,20,15,0.1) 55%, transparent)" : "rgba(5,15,20,0.45)",
        overflow: "hidden",
        [SHORT]: {
          alignItems: "stretch",
          justifyContent: "stretch",
          p: 0.75,
          pl: "max(6px, env(safe-area-inset-left))",
          pr: "max(6px, env(safe-area-inset-right))",
          pt: "max(6px, env(safe-area-inset-top))",
          pb: "max(6px, env(safe-area-inset-bottom))",
        },
      }}
    >
      <Box
        sx={{
          ...menuCard,
          width: wide ? "min(980px, 100%)" : "min(440px, 100%)",
          maxHeight: "100%",
          overflowY: "auto",
          p: { xs: 2, sm: 3 },
          [SHORT]: {
            width: "100%",
            maxWidth: "100%",
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            p: 1.25,
            borderRadius: "16px",
          },
        }}
      >
        <Box sx={{ [SHORT]: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } }}>{children}</Box>
      </Box>
    </Box>
  );
}

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, [SHORT]: { mb: 0.75, flexShrink: 0 } }}>
      <IconButton aria-label="Back" onClick={onBack} sx={{ color: H.cream, border: `2px solid ${H.gold}66`, [SHORT]: { p: 0.6 } }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Typography component="h2" sx={{ ...bigText, fontSize: { xs: 24, sm: 30 }, [SHORT]: { fontSize: 20 }, flex: 1 }}>
        {title}
      </Typography>
      {right}
    </Box>
  );
}

function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <Box sx={{ display: "flex" }} aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <StarRoundedIcon key={i} sx={{ fontSize: size, [SHORT]: { fontSize: Math.min(size, 14) }, color: i <= n ? H.gold : "rgba(255,255,255,0.22)", filter: i <= n ? `drop-shadow(0 0 4px ${H.gold}88)` : undefined }} />
      ))}
    </Box>
  );
}

export function MainMenu({ nickname, onPlay, onExplore, onJournal, onSettings, onQuit }: { nickname: string; onPlay: () => void; onExplore: () => void; onJournal: () => void; onSettings: () => void; onQuit: () => void }) {
  const levels = useHuntProgress((s) => s.levels);
  const journal = useHuntProgress((s) => s.journal);
  const badges = useHuntProgress((s) => s.badges);
  const difficulty = useHuntProgress((s) => s.difficulty);
  const preset = DIFFICULTIES.find((d) => d.id === difficulty) ?? DIFFICULTIES[0];
  const stars = Object.values(levels).reduce((n, r) => n + r.stars, 0);
  const found = Object.keys(journal).length;
  return (
    <Screen>
      <Box
        sx={{
          [SHORT]: {
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.15fr)",
            columnGap: 2,
            alignItems: "center",
          },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: 2, fontSize: 13, color: H.gold, [SHORT]: { fontSize: 11, letterSpacing: 1 } }}>🦆 GRETA&apos;S GAMES PRESENTS</Typography>
          <Typography component="h1" aria-label={GAME_TITLE} sx={{ ...bigText, fontSize: { xs: 38, sm: 50 }, [SHORT]: { fontSize: 32 }, mt: 0.5, background: `linear-gradient(180deg, #fff7d1, ${H.gold} 55%, ${H.goldDeep})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "none", filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.45))" }}>
            ELIJAH&apos;S
          </Typography>
          <Typography sx={{ ...bigText, fontSize: { xs: 30, sm: 40 }, [SHORT]: { fontSize: 22, letterSpacing: 1 }, letterSpacing: 4, mt: -0.5 }}>QUACK ATTACK</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5, mb: 2.5, [SHORT]: { mt: 1, mb: 0, gap: 0.6 } }}>
            <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>👤 {nickname}</Typography>
            <ButtonBase onClick={onSettings} sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", color: H.cream, fontFamily: "inherit", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>
              {preset.emoji} {preset.label}
            </ButtonBase>
            <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>⭐ {stars}/{LEVELS.length * 3}</Typography>
            <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>🏅 {Object.keys(badges).length}/{BADGES.length}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gap: 1.4, [SHORT]: { gap: 0.7, alignContent: "center" } }}>
          <Button onClick={onPlay} sx={{ ...bigButton(H.orange, H.orangeDeep), minHeight: 66, fontSize: "1.4rem", [SHORT]: { minHeight: 44, fontSize: "1.05rem" }, animation: "huntMenuPulse 1.8s ease-in-out infinite", "@keyframes huntMenuPulse": { "50%": { transform: "scale(1.025)" } } }}>
            <span aria-hidden>🎯</span> Play Adventure
          </Button>
          <Button onClick={onExplore} sx={{ ...bigButton(H.teal, H.tealDeep), [SHORT]: { minHeight: 44, fontSize: "1.05rem" } }}>
            <span aria-hidden>📷</span>
            <Box sx={{ textAlign: "left" }}>
              Wildlife Explorer
              <Typography component="span" sx={{ display: "block", fontSize: 12, fontWeight: 600, opacity: 0.9, [SHORT]: { display: "none" } }}>
                Photograph animals. No shooting!
              </Typography>
            </Box>
          </Button>
          <Button onClick={onJournal} sx={{ ...bigButton("#4f8fe8", "#2a5fb3"), [SHORT]: { minHeight: 44, fontSize: "1.05rem" } }}>
            <span aria-hidden>📖</span> Field Journal
            <Box component="span" sx={{ ml: "auto", fontSize: 14, opacity: 0.9 }}>
              {found}/{SPECIES.length}
            </Box>
          </Button>
          <Button onClick={onSettings} sx={{ ...bigButton("#6b7b8f", "#454f5d"), [SHORT]: { minHeight: 44, fontSize: "1.05rem" } }}>
            <span aria-hidden>⚙️</span> Settings
          </Button>
          <Button onClick={onQuit} startIcon={<ArrowBackRoundedIcon />} sx={{ color: H.cream, justifyContent: "flex-start", textTransform: "none", fontWeight: 700, mt: 0.5, [SHORT]: { mt: 0, minHeight: 36, py: 0.25 } }}>
            Back to the arcade
          </Button>
        </Box>
      </Box>
    </Screen>
  );
}

export function LevelSelect({ onPick, onBack }: { onPick: (l: LevelDef) => void; onBack: () => void }) {
  const levels = useHuntProgress((s) => s.levels);
  const stars = starsByLevel({ levels });
  return (
    <Screen wide align="center">
      <Header title="Choose your adventure" onBack={onBack} />
      <Box sx={{ display: "flex", gap: 1.2, overflowX: "auto", pb: 1, mb: 2, [SHORT]: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", overflow: "visible", flexShrink: 0, gap: 0.6, pb: 0, mb: 0.75 } }}>
        {WORLDS.map((w) => (
          <Box
            key={w.id}
            aria-disabled={!w.available}
            sx={{
              flex: "0 0 auto",
              width: 150,
              p: 1.2,
              borderRadius: 3,
              border: `2px solid ${w.available ? H.gold : "rgba(255,255,255,0.15)"}`,
              bgcolor: w.available ? "rgba(245,197,66,0.15)" : "rgba(0,0,0,0.25)",
              opacity: w.available ? 1 : 0.6,
              [SHORT]: { width: "auto", p: 0.7, borderRadius: 2 },
            }}
          >
            <Typography sx={{ fontSize: 28, [SHORT]: { fontSize: 18, lineHeight: 1 } }}>{w.available ? w.emoji : "🔒"}</Typography>
            <Typography
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 14,
                [SHORT]: { fontSize: 11, lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
              }}
            >
              {w.number}. {w.name}
            </Typography>
            <Typography sx={{ fontSize: 11, opacity: 0.8, [SHORT]: { display: "none" } }}>{w.available ? w.difficulty : "Coming soon"}</Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: H.gold, mb: 1, [SHORT]: { mb: 0.6, fontSize: 13, flexShrink: 0 } }}>World 1 · Peaceful Lakeside</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(170px, 1fr))" }, gap: 1.2, [SHORT]: { flex: 1, minHeight: 0, gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 0.6 } }}>
        {LEVELS.map((l) => {
          const open = isLevelUnlocked(l.id, stars);
          const rec = levels[l.id];
          return (
            <ButtonBase
              key={l.id}
              disabled={!open}
              onClick={() => onPick(l)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                textAlign: "left",
                p: 1.5,
                borderRadius: 3,
                color: H.cream,
                border: `2px solid ${open ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                background: open ? "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))" : "rgba(0,0,0,0.25)",
                opacity: open ? 1 : 0.55,
                transition: "transform 120ms",
                "&:hover": { transform: open ? "translateY(-2px)" : undefined, borderColor: open ? H.gold : undefined },
                "&:focus-visible": { outline: `3px solid ${H.gold}` },
                [SHORT]: { height: "100%", p: 0.8, borderRadius: 2 },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: open ? H.orange : "#555", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, [SHORT]: { width: 26, height: 26, fontSize: 14 } }}>{l.number}</Box>
                {open ? <Stars n={rec?.stars ?? 0} size={18} /> : <LockRoundedIcon sx={{ opacity: 0.7, [SHORT]: { fontSize: 18 } }} />}
              </Box>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, mt: 1, [SHORT]: { fontSize: 13, mt: 0.6, lineHeight: 1.15 } }}>{l.name}</Typography>
              <Typography sx={{ fontSize: 12.5, opacity: 0.85, minHeight: 34, [SHORT]: { fontSize: 11, minHeight: 0, mt: 0.4, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } }}>{l.blurb}</Typography>
              <Typography sx={{ fontSize: 12, mt: 0.6, color: H.gold, [SHORT]: { fontSize: 10.5, mt: 0.4, lineHeight: 1.2 } }}>{rec?.bestScore ? `Best ${rec.bestScore.toLocaleString()}` : open ? "Not played yet" : "Earn a star on the level before"}</Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Screen>
  );
}

export function LevelIntro({ level, preset, boost, touch, onStart, onBack }: { level: LevelDef; preset: DifficultyPreset; boost: AdaptiveBoost; touch: boolean; onStart: () => void; onBack: () => void }) {
  const explore = level.activity === "explore";
  const journal = useHuntProgress((s) => s.journal);
  const time = level.timeLimit === null ? null : Math.round(level.timeLimit * preset.timeMul * boost.timeMul);
  const shells = level.reserve === null ? "Unlimited" : `${5 + level.reserve + preset.reserveBonus}`;
  const controls = touch
    ? [["👆 Drag", "look around"], [explore ? "📸 SNAP" : "💥 FIRE", explore ? "take a photo" : "shoot"], ...(explore ? [["🔍 ZOOM", "get closer"]] : [["🔄", "reload"], ["🎯 Hold AIM", "zoom in a little"], ["📷", "switch to the camera"]])]
    : [["🖱️ Move", "look around"], ["Click", explore ? "take a photo" : "shoot"], [explore ? "Right-click / wheel" : "Right-click", explore ? "zoom" : "aim closer"], ...(explore ? [] : [["R", "reload"], ["Q", "camera for wildlife photos"]]), ["Esc", "pause"]];
  return (
    <Screen align="center">
      <Header title={explore ? "Wildlife Explorer" : `Level ${level.number}: ${level.name}`} onBack={onBack} />
      <Box
        sx={{
          [SHORT]: {
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
            columnGap: 1.5,
            alignItems: "stretch",
          },
        }}
      >
        <Box sx={{ [SHORT]: { minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, p: 1.5, borderRadius: 3, bgcolor: "rgba(0,0,0,0.25)", mb: 1.5, [SHORT]: { p: 1, mb: 0.75, gap: 1 } }}>
            <Typography sx={{ fontSize: 34, [SHORT]: { fontSize: 26 } }}>{explore ? "📷" : "🎯"}</Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, [SHORT]: { fontSize: 16 } }}>{objectiveText(level)}</Typography>
              <Typography sx={{ fontSize: 13, opacity: 0.85, [SHORT]: { fontSize: 12 } }}>{explore ? `${Object.keys(journal).length} of ${SPECIES.length} animals in your journal` : level.blurb}</Typography>
            </Box>
          </Box>
          {!explore && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5, [SHORT]: { mb: 0.75, gap: 0.6 } }}>
              <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>⏱ {time === null ? "No clock" : formatClock(time)}</Typography>
              <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>🔴 Shells: {shells}</Typography>
              <Typography sx={{ fontSize: 13, px: 1.2, py: 0.4, borderRadius: 999, bgcolor: "rgba(0,0,0,0.3)", [SHORT]: { fontSize: 12, px: 1, py: 0.25 } }}>
                {preset.emoji} {preset.label}
              </Typography>
            </Box>
          )}
          {boost.note && !explore && (
            <Typography sx={{ fontSize: 14, p: 1.2, borderRadius: 2, bgcolor: "rgba(61,220,132,0.18)", border: `1px solid ${H.green}88`, mb: 1.5, [SHORT]: { fontSize: 12, p: 0.8, mb: 0.75 } }}>💚 {boost.note}</Typography>
          )}
          <Typography sx={{ fontSize: 14, mb: 1.5, [SHORT]: { fontSize: 12, mb: 0.75 } }}>💡 {level.tip}</Typography>
          {!explore && <Typography sx={{ display: "none", [SHORT]: { display: "block", fontSize: 11.5, opacity: 0.85 } }}>🦢 Swans, herons, turtles and other lake animals are protected. Use your camera on them instead!</Typography>}
        </Box>
        <Box sx={{ [SHORT]: { minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.5, p: 1.5, borderRadius: 3, bgcolor: "rgba(0,0,0,0.2)", mb: 2, [SHORT]: { display: "flex", flexDirection: "column", gap: 0.25, p: 1, mb: 0.75, alignContent: "start" } }}>
            {controls.map(([k, v]) => (
              <Box key={k} sx={{ display: "contents", [SHORT]: { display: "flex", gap: 0.75, alignItems: "baseline" } }}>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: H.gold, [SHORT]: { fontSize: 12, flexShrink: 0 } }}>{k}</Typography>
                <Typography sx={{ fontSize: 13, [SHORT]: { fontSize: 12 } }}>{v}</Typography>
              </Box>
            ))}
          </Box>
          {!explore && <Typography sx={{ fontSize: 12.5, opacity: 0.85, mb: 1.5, [SHORT]: { display: "none" } }}>🦢 Swans, herons, turtles and other lake animals are protected. Use your camera on them instead!</Typography>}
          <Button onClick={onStart} sx={{ ...bigButton(H.orange, H.orangeDeep), justifyContent: "center", fontSize: "1.5rem", minHeight: 64, [SHORT]: { mt: "auto", minHeight: 42, fontSize: "1.1rem", flexShrink: 0 } }}>
            {explore ? "Start exploring" : "Start!"}
          </Button>
        </Box>
      </Box>
    </Screen>
  );
}

export function Journal({ onBack }: { onBack: () => void }) {
  const journal = useHuntProgress((s) => s.journal);
  const badges = useHuntProgress((s) => s.badges);
  const found = Object.keys(journal).length;
  return (
    <Screen wide align="center">
      <Header title="📖 Field Journal" onBack={onBack} right={<Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: H.gold, [SHORT]: { fontSize: 13 } }}>{found}/{SPECIES.length} found</Typography>} />
      <Box sx={{ [SHORT]: { flex: 1, minHeight: 0, overflowY: "auto" } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.2, [SHORT]: { gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 0.6 } }}>
        {SPECIES.map((s) => {
          const e = journal[s.id];
          return (
            <Box key={s.id} sx={{ p: 1, borderRadius: 3, border: `2px solid ${e ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`, bgcolor: e ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.25)", [SHORT]: { p: 0.6, borderRadius: 2 } }}>
              <Box sx={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 2, overflow: "hidden", bgcolor: "#0d2a20", display: "grid", placeItems: "center", [SHORT]: { aspectRatio: "auto", height: 22, borderRadius: 1.5 } }}>
                {e?.thumb ? (
                  <Box component="img" src={e.thumb} alt={`Your photo of a ${s.name}`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Typography sx={{ fontSize: 46, [SHORT]: { fontSize: 22 }, filter: e ? "none" : "brightness(0) opacity(0.45)" }}>{s.emoji}</Typography>
                )}
                <Typography sx={{ position: "absolute", top: 6, left: 6, fontSize: 10.5, fontWeight: 800, px: 0.8, py: 0.2, borderRadius: 999, bgcolor: s.rarity === "rare" ? "#8a4dff" : s.rarity === "uncommon" ? "#1e8fc9" : "rgba(0,0,0,0.5)", [SHORT]: { display: "none" } }}>{RARITY_LABEL[s.rarity]}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.8, [SHORT]: { mt: 0.3 } }}>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, [SHORT]: { fontSize: 11, lineHeight: 1.15 } }}>{e ? s.name : "???"}</Typography>
                {e && <Stars n={e.bestStars} size={15} />}
              </Box>
              <Typography sx={{ fontSize: 12, opacity: 0.85, mt: 0.3, lineHeight: 1.3, [SHORT]: { fontSize: 10, mt: 0.15, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" } }}>{e ? s.fact : `Hint: ${s.hint}`}</Typography>
            </Box>
          );
        })}
      </Box>
      <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: H.gold, mt: 2.5, mb: 1, [SHORT]: { mt: 0.5, mb: 0.3, fontSize: 13, flexShrink: 0 } }}>Badges</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1, [SHORT]: { gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 0.5, flexShrink: 0 } }}>
        {BADGES.map((b) => {
          const got = !!badges[b.id];
          return (
            <Box key={b.id} sx={{ display: "flex", gap: 1, alignItems: "center", p: 1, borderRadius: 2, bgcolor: got ? "rgba(245,197,66,0.16)" : "rgba(0,0,0,0.22)", border: `1px solid ${got ? H.gold : "transparent"}`, [SHORT]: { gap: 0.4, p: 0.5, alignItems: "flex-start" } }}>
              <Typography sx={{ fontSize: 26, [SHORT]: { fontSize: 16, lineHeight: 1 }, filter: got ? "none" : "grayscale(1) opacity(0.5)" }}>{b.emoji}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, [SHORT]: { fontSize: 10, lineHeight: 1.15 } }}>{b.title}</Typography>
                <Typography sx={{ fontSize: 11, opacity: 0.8, [SHORT]: { display: "none" } }}>{b.description}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      </Box>
    </Screen>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 0.8, borderBottom: "1px solid rgba(255,255,255,0.08)", [SHORT]: { py: 0.2, gap: 1 } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5, [SHORT]: { fontSize: 13 } }}>{label}</Typography>
        {hint && <Typography sx={{ fontSize: 12, opacity: 0.75, [SHORT]: { display: "none" } }}>{hint}</Typography>}
      </Box>
      {children}
    </Box>
  );
}

export function SettingsPanel({ onBack, onDifficulty }: { onBack: () => void; onDifficulty?: () => void }) {
  const p = useHuntProgress();
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const toggleReduced = useSettingsStore((s) => s.toggleReducedMotion);
  return (
    <Screen align="center">
      <Header title="⚙️ Settings" onBack={onBack} />
      <Box sx={{ [SHORT]: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } }}>
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: H.gold, mb: 1, [SHORT]: { mb: 0.5, fontSize: 13, flexShrink: 0 } }}>Difficulty</Typography>
        <Box role="radiogroup" aria-label="Difficulty" sx={{ display: "grid", gap: 1, mb: 2, [SHORT]: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.6, mb: 0.6, flexShrink: 0 } }}>
          {DIFFICULTIES.map((d) => {
            const on = p.difficulty === d.id;
            return (
              <ButtonBase
                key={d.id}
                role="radio"
                aria-checked={on}
                onClick={() => {
                  p.setDifficulty(d.id);
                  onDifficulty?.();
                }}
                sx={{ display: "flex", justifyContent: "flex-start", gap: 1.2, p: 1.2, borderRadius: 3, textAlign: "left", color: H.cream, border: `2px solid ${on ? H.gold : "rgba(255,255,255,0.15)"}`, bgcolor: on ? "rgba(245,197,66,0.16)" : "rgba(0,0,0,0.2)", "&:focus-visible": { outline: `3px solid ${H.gold}` }, [SHORT]: { alignItems: "center", gap: 0.6, p: 0.7, borderRadius: 2 } }}
              >
                <Typography sx={{ fontSize: 28, [SHORT]: { fontSize: 20, lineHeight: 1 } }}>{d.emoji}</Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, [SHORT]: { fontSize: 12, lineHeight: 1.15 } }}>
                    {d.label} <Box component="span" sx={{ fontSize: 12, opacity: 0.75, fontWeight: 600, [SHORT]: { display: "block", fontSize: 10 } }}>{d.ages}</Box>
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, opacity: 0.85, [SHORT]: { display: "none" } }}>{d.blurb}</Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        <Typography sx={{ display: "none", [SHORT]: { display: "block", fontSize: 12, mb: 0.25, opacity: 0.85, flexShrink: 0 } }}>{DIFFICULTIES.find((d) => d.id === p.difficulty)?.blurb}</Typography>
        <Box sx={{ [SHORT]: { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, alignContent: "start", "& > :last-child": { gridColumn: "1 / -1" } } }}>
          <Row label="Look speed" hint="How fast the view turns">
            <Slider aria-label="Look speed" value={p.sensitivity} min={0.4} max={2} step={0.1} onChange={(_, v) => p.setSensitivity(v as number)} sx={{ width: 140, [SHORT]: { width: 88 }, color: H.gold }} />
          </Row>
          <Row label="Aim helper" hint="Gently pulls your aim onto ducks">
            <Switch size="small" checked={p.assist} onChange={(_, v) => p.setAssist(v)} slotProps={{ input: { "aria-label": "Aim helper" } }} />
          </Row>
          <Row label="Invert up/down look">
            <Switch size="small" checked={p.invertY} onChange={(_, v) => p.setInvertY(v)} slotProps={{ input: { "aria-label": "Invert up and down" } }} />
          </Row>
          <Row label="Control hints" hint="Show keys at the bottom of the screen">
            <Switch size="small" checked={p.hints} onChange={(_, v) => p.setHints(v)} slotProps={{ input: { "aria-label": "Control hints" } }} />
          </Row>
          <Row label="Calm mode" hint="Less shake, sway and flashing">
            <Switch size="small" checked={reducedMotion} onChange={toggleReduced} slotProps={{ input: { "aria-label": "Calm mode" } }} />
          </Row>
          <Row label="Sound, music, vibration">
            <SettingsToggles size="small" />
          </Row>
        </Box>
        <Button onClick={onBack} sx={{ ...bigButton(H.orange, H.orangeDeep), justifyContent: "center", mt: 2, [SHORT]: { mt: "auto", minHeight: 36, py: 0, fontSize: "1rem", lineHeight: 1, flexShrink: 0, boxShadow: `0 3px 0 ${H.orangeDeep}` } }}>
          Done
        </Button>
      </Box>
    </Screen>
  );
}
