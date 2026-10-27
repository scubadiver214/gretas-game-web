"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { BADGE_BY_ID } from "../badges";
import type { LevelDef } from "../levels";
import { SPECIES_BY_ID } from "../species";
import type { HuntSummary, SpeciesId } from "../types";
import { H, bigButton, bigText } from "./hudStyle";
import { Screen } from "./Menus";

export function PauseOverlay({ explore, touch, onResume, onRestart, onSettings, onFinishExplore, onMenu }: { explore: boolean; touch: boolean; onResume: () => void; onRestart: () => void; onSettings: () => void; onFinishExplore: () => void; onMenu: () => void }) {
  const [help, setHelp] = useState(false);
  return (
    <Screen align="center">
      <Typography component="h2" sx={{ ...bigText, fontSize: 36, textAlign: "center", mb: 2 }}>
        Paused
      </Typography>
      {help ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: H.gold, mb: 1 }}>How to play</Typography>
          {[
            touch ? "👆 Drag anywhere to look around." : "🖱️ Move the mouse to look around. Click the game first if it doesn't turn.",
            explore ? "📸 Tap SNAP (or click) to take a photo." : "💥 Put the circle on a flying duck and shoot. It turns gold when you're on target!",
            "🦆 Mallards, teal, pintails, wood ducks, shovelers and canvasbacks all count. They fly in lines, Vs, stacks and crossing flocks.",
            "💨 A shot aimed at a duck or a flock makes them scatter and fly faster if you miss. Swing with them.",
            "🔴 The shotgun holds 5 shells. It reloads by itself when empty, or press R / RELOAD.",
            "🎯 Hold AIM (right-click) to zoom in a little and tighten your shot.",
            "📷 Switch to the camera (Q) to photograph protected animals for your Field Journal.",
            "🔍 Small animals like the frog need zooming in. Keep the animal in the middle for 3 stars.",
            "🔥 Hitting ducks in a row builds your multiplier.",
          ].map((t) => (
            <Typography key={t} sx={{ fontSize: 14, mb: 0.7 }}>
              {t}
            </Typography>
          ))}
        </Box>
      ) : null}
      <Box sx={{ display: "grid", gap: 1.2 }}>
        <Button onClick={onResume} sx={{ ...bigButton(H.orange, H.orangeDeep), justifyContent: "center" }}>
          ▶ Resume
        </Button>
        {explore ? (
          <Button onClick={onFinishExplore} sx={{ ...bigButton(H.teal, H.tealDeep), justifyContent: "center" }}>
            📖 Finish exploring
          </Button>
        ) : (
          <Button onClick={onRestart} sx={{ ...bigButton("#4f8fe8", "#2a5fb3"), justifyContent: "center" }}>
            🔁 Restart level
          </Button>
        )}
        <Button onClick={() => setHelp((h) => !h)} sx={{ ...bigButton("#6b7b8f", "#454f5d"), justifyContent: "center" }}>
          ❓ {help ? "Hide help" : "How to play"}
        </Button>
        <Button onClick={onSettings} sx={{ ...bigButton("#6b7b8f", "#454f5d"), justifyContent: "center" }}>
          ⚙️ Settings
        </Button>
        <Button onClick={onMenu} sx={{ color: H.cream, textTransform: "none", fontWeight: 700 }}>
          Main menu
        </Button>
      </Box>
    </Screen>
  );
}

function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0,0,0,0.25)", textAlign: "center" }}>
      <Typography sx={{ ...bigText, fontSize: 22 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, opacity: 0.8 }}>{label}</Typography>
    </Box>
  );
}

export function ResultsCard({
  summary,
  level,
  badges,
  rank,
  personalBest,
  hasNext,
  helpNext,
  onNext,
  onReplay,
  onMenu,
}: {
  summary: HuntSummary;
  level: LevelDef;
  badges: string[];
  rank?: number;
  personalBest?: boolean;
  hasNext: boolean;
  helpNext: string | null;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const score = useCountUp(summary.score);
  const win = summary.success;
  return (
    <Screen align="center">
      <Typography component="h2" sx={{ ...bigText, fontSize: 34, textAlign: "center", color: win ? H.gold : H.cream }}>
        {win ? "Level complete!" : summary.outOfAmmo ? "Out of shells!" : "So close!"}
      </Typography>
      <Typography sx={{ textAlign: "center", opacity: 0.85, mb: 1 }}>
        Level {level.number} · {level.name}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mb: 1 }} aria-label={`${summary.stars} of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <StarRoundedIcon
            key={i}
            sx={{
              fontSize: i === 2 ? 74 : 60,
              mt: i === 2 ? 0 : 1.2,
              color: i <= summary.stars ? H.gold : "rgba(255,255,255,0.18)",
              filter: i <= summary.stars ? `drop-shadow(0 0 10px ${H.gold})` : undefined,
              animation: i <= summary.stars ? `huntStar 420ms ${0.25 + i * 0.25}s cubic-bezier(.2,1.6,.4,1) both` : undefined,
              "@keyframes huntStar": { from: { transform: "scale(0) rotate(-40deg)" }, to: { transform: "scale(1) rotate(0)" } },
            }}
          />
        ))}
      </Box>
      <Typography sx={{ ...bigText, fontSize: 46, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{score.toLocaleString()}</Typography>
      {(rank || personalBest) && (
        <Typography sx={{ textAlign: "center", color: H.gold, fontWeight: 800, mb: 1 }}>
          {personalBest ? "🏆 New personal best! " : ""}
          {rank ? `Rank #${rank} on the leaderboard` : ""}
        </Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, my: 1.5 }}>
        <Stat label="Ducks hit" value={`${summary.hits}/${summary.ducks}`} />
        <Stat label="Accuracy" value={summary.shots ? `${Math.round(summary.accuracy * 100)}%` : "–"} />
        <Stat label="Best streak" value={String(summary.bestStreak)} />
        {level.objective.kind === "doubles" && <Stat label="Pairs" value={String(summary.doubles)} />}
        {summary.multiShots > 0 && <Stat label="Two-for-one" value={String(summary.multiShots)} />}
        {summary.photos > 0 && <Stat label="Photos" value={String(summary.photos)} />}
      </Box>
      {summary.bonuses.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          {summary.bonuses.map((b) => (
            <Box key={b.label} sx={{ display: "flex", justifyContent: "space-between", fontSize: 14, py: 0.2 }}>
              <span>{b.label}</span>
              <Box component="span" sx={{ color: H.gold, fontWeight: 800 }}>
                +{b.points}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {badges.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 1.5 }}>
          {badges.map((id) => (
            <Typography key={id} sx={{ fontSize: 13, px: 1.2, py: 0.5, borderRadius: 999, border: `1px solid ${H.gold}`, bgcolor: "rgba(245,197,66,0.15)" }}>
              {BADGE_BY_ID[id]?.emoji} {BADGE_BY_ID[id]?.title}
            </Typography>
          ))}
        </Box>
      )}
      {!win && (
        <Typography sx={{ fontSize: 14, p: 1.2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.25)", mb: 1.5 }}>
          💡 {level.tip}
          {helpNext ? ` ${helpNext}` : ""}
        </Typography>
      )}
      {summary.protectedHits > 0 && <Typography sx={{ fontSize: 13, opacity: 0.85, mb: 1.5 }}>🦢 Remember: swans, herons and other lake animals are protected. Photograph them instead!</Typography>}
      <Box sx={{ display: "grid", gap: 1.2 }}>
        {win && hasNext && (
          <Button onClick={onNext} sx={{ ...bigButton(H.orange, H.orangeDeep), justifyContent: "center" }}>
            Next level ▶
          </Button>
        )}
        <Button onClick={onReplay} sx={{ ...bigButton(win && hasNext ? "#4f8fe8" : H.orange, win && hasNext ? "#2a5fb3" : H.orangeDeep), justifyContent: "center" }}>
          {win ? "🔁 Play again" : "🔁 Try again"}
        </Button>
        <Button onClick={onMenu} sx={{ color: H.cream, textTransform: "none", fontWeight: 700 }}>
          Main menu
        </Button>
      </Box>
    </Screen>
  );
}

export function ExploreSummary({ summary, discovered, badges, journalCount, onKeepExploring, onJournal, onMenu }: { summary: HuntSummary; discovered: SpeciesId[]; badges: string[]; journalCount: number; onKeepExploring: () => void; onJournal: () => void; onMenu: () => void }) {
  return (
    <Screen align="center">
      <Typography component="h2" sx={{ ...bigText, fontSize: 32, textAlign: "center", color: H.gold }}>
        Great exploring!
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, my: 2 }}>
        <Stat label="Photos taken" value={String(summary.photos)} />
        <Stat label="Field Journal" value={`${journalCount}/8`} />
      </Box>
      {discovered.length > 0 ? (
        <>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, mb: 1 }}>New discoveries</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {discovered.map((id) => (
              <Typography key={id} sx={{ fontSize: 14, px: 1.2, py: 0.5, borderRadius: 999, bgcolor: "rgba(61,220,132,0.2)", border: `1px solid ${H.green}` }}>
                {SPECIES_BY_ID[id].emoji} {SPECIES_BY_ID[id].name}
              </Typography>
            ))}
          </Box>
        </>
      ) : (
        <Typography sx={{ fontSize: 14, opacity: 0.85, mb: 2 }}>No new animals this time. Check the Field Journal for hints about who&apos;s still hiding!</Typography>
      )}
      {badges.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 2 }}>
          {badges.map((id) => (
            <Typography key={id} sx={{ fontSize: 13, px: 1.2, py: 0.5, borderRadius: 999, border: `1px solid ${H.gold}`, bgcolor: "rgba(245,197,66,0.15)" }}>
              {BADGE_BY_ID[id]?.emoji} {BADGE_BY_ID[id]?.title}
            </Typography>
          ))}
        </Box>
      )}
      <Box sx={{ display: "grid", gap: 1.2 }}>
        <Button onClick={onKeepExploring} sx={{ ...bigButton(H.teal, H.tealDeep), justifyContent: "center" }}>
          📷 Keep exploring
        </Button>
        <Button onClick={onJournal} sx={{ ...bigButton("#4f8fe8", "#2a5fb3"), justifyContent: "center" }}>
          📖 Field Journal
        </Button>
        <Button onClick={onMenu} sx={{ color: H.cream, textTransform: "none", fontWeight: 700 }}>
          Main menu
        </Button>
      </Box>
    </Screen>
  );
}

export function LoadingScreen({ failed, onBack }: { failed: boolean; onBack: () => void }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "linear-gradient(180deg, #2f7fe3 0%, #9fd0f5 55%, #2f8fa8 56%, #145f80 100%)", textAlign: "center", p: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 64, animation: failed ? undefined : "huntBob 1.4s ease-in-out infinite", "@keyframes huntBob": { "50%": { transform: "translateY(-10px) rotate(-6deg)" } } }}>🦆</Typography>
        {failed ? (
          <>
            <Typography sx={{ ...bigText, fontSize: 26, mt: 1 }}>The 3D lake can&apos;t open on this device</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.9)", mt: 1, maxWidth: 420 }}>This game needs WebGL. Try another browser, or turn on hardware acceleration in your browser settings.</Typography>
            <Button onClick={onBack} sx={{ ...bigButton(H.orange, H.orangeDeep), justifyContent: "center", mt: 2, maxWidth: 280 }}>
              Back to the arcade
            </Button>
          </>
        ) : (
          <>
            <Typography sx={{ ...bigText, fontSize: 26, mt: 1 }}>Heading to Peaceful Lakeside…</Typography>
            <CircularProgress sx={{ color: H.gold, mt: 2 }} />
          </>
        )}
      </Box>
    </Box>
  );
}

export function RotatePrompt() {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center", bgcolor: "rgba(5,20,15,0.9)", textAlign: "center", p: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 72, display: "inline-block", animation: "huntTurn 1.6s ease-in-out infinite", "@keyframes huntTurn": { "0%,20%": { transform: "rotate(0deg)" }, "60%,100%": { transform: "rotate(-90deg)" } } }} aria-hidden>
          📱
        </Typography>
        <Typography sx={{ ...bigText, fontSize: 28, mt: 1 }}>Turn your device sideways</Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>The lake looks best in landscape.</Typography>
      </Box>
    </Box>
  );
}
