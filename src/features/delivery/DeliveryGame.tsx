"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AttractionsRoundedIcon from "@mui/icons-material/AttractionsRounded";
import GameShell from "@/components/GameShell";
import RequirePlayer from "@/components/RequirePlayer";
import TouchControls from "@/components/TouchControls";
import { ComboMeter, CountdownOverlay, FlashOverlay, IntroCard, QuitButton, ScorePill, ScorePopups, SettingsToggles, TimerPill } from "@/components/HUD";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { LEVEL_NAMES } from "@/features/player/progress";
import { C } from "@/design/tokens";
import { COMBO_EVERY, ROUND_SECONDS, deliveryStars, type PowerUpKind } from "./scoring";
import { useDeliveryGame } from "./useDeliveryGame";

const DeliveryScene = dynamic(() => import("./DeliveryScene"), { ssr: false });

const SWIPE_PX = 28;
const SWIPE_UP_PX = 36;

const POWER_UP_ICON: Record<PowerUpKind, typeof BoltRoundedIcon> = {
  magnet: AttractionsRoundedIcon,
  shield: ShieldRoundedIcon,
  turbo: BoltRoundedIcon,
};

const POWER_UP_FILL: Record<PowerUpKind, { fill: string; edge: string }> = {
  magnet: { fill: "#8B5CF6", edge: "#6D28D9" },
  shield: { fill: C.blue, edge: C.blueDeep },
  turbo: { fill: C.sun, edge: C.sunDeep },
};

/** `now` is derived from the store's clock so this stays a pure render. */
function PowerUpChip({ kind, until, now }: { kind: PowerUpKind; until: number; now: number }) {
  const Icon = POWER_UP_ICON[kind];
  const seconds = Number.isFinite(until) ? Math.max(0, Math.ceil((until - now) / 1000)) : null;
  const { fill, edge } = POWER_UP_FILL[kind];
  const ending = seconds !== null && seconds <= 2;
  return (
    <Box
      aria-label={`${kind} power-up${seconds === null ? "" : `, ${seconds} seconds left`}`}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        pl: 0.5,
        pr: 1.25,
        height: 46,
        borderRadius: 999,
        bgcolor: fill,
        color: kind === "turbo" ? C.ink : C.white,
        boxShadow: `0 4px 0 ${edge}, 0 8px 16px rgba(22,33,46,0.18)`,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "1.05rem",
        animation: ending ? "puEnding 400ms ease-in-out infinite" : undefined,
        "@keyframes puEnding": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.45 } },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          bgcolor: "rgba(255,255,255,0.28)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <span className="tnum">{seconds === null ? "∞" : `${seconds}s`}</span>
    </Box>
  );
}

function Inner() {
  const router = useRouter();
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const hairColor = usePlayerStore((s) => s.hairColor);
  const bikeSkin = usePlayerStore((s) => s.bikeSkin);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const setup = useRoundSetup("delivery");

  const phase = useDeliveryGame((s) => s.phase);
  const config = useDeliveryGame((s) => s.config);
  const score = useDeliveryGame((s) => s.score);
  const combo = useDeliveryGame((s) => s.combo);
  const bestCombo = useDeliveryGame((s) => s.bestCombo);
  const deliveries = useDeliveryGame((s) => s.deliveries);
  const hits = useDeliveryGame((s) => s.hits);
  const jumps = useDeliveryGame((s) => s.jumps);
  const powerUpsCollected = useDeliveryGame((s) => s.powerUpsCollected);
  const timeLeft = useDeliveryGame((s) => s.timeLeft);
  const powerUp = useDeliveryGame((s) => s.powerUp);
  const shield = useDeliveryGame((s) => s.shield);
  const startedAt = useDeliveryGame((s) => s.startedAt);
  const begin = useDeliveryGame((s) => s.begin);
  const startRide = useDeliveryGame((s) => s.startRide);
  const moveLeft = useDeliveryGame((s) => s.moveLeft);
  const moveRight = useDeliveryGame((s) => s.moveRight);
  const jump = useDeliveryGame((s) => s.jump);
  const reset = useDeliveryGame((s) => s.reset);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (phase !== "finished") return;
    finishRound({
      mode: "delivery",
      score,
      durationSeconds: ROUND_SECONDS,
      roundId: `delivery-${startedAt}`,
      level: config.level,
      challengeDate: config.challengeDate,
      stars: deliveryStars(score, config.level),
      metrics: { deliveries, bestCombo, hits, jumps, powerUps: powerUpsCollected },
      highlights: [
        { label: "Pizzas delivered", value: String(deliveries) },
        { label: "Best combo", value: String(bestCombo) },
        { label: "Bumps", value: String(hits) },
        ...(powerUpsCollected > 0 ? [{ label: "Power-ups", value: String(powerUpsCollected) }] : []),
      ],
    });
    router.replace("/results");
  }, [phase, score, deliveries, bestCombo, hits, jumps, powerUpsCollected, startedAt, config, finishRound, router]);

  const onCountdownDone = useCallback(() => startRide(), [startRide]);
  const onStart = useCallback(
    () => begin({ level: setup.level, seed: setup.seed, challengeDate: setup.challengeDate }),
    [begin, setup.level, setup.seed, setup.challengeDate],
  );
  const levelLabel = setup.isDaily ? "📅 Daily challenge" : `Level ${setup.level} · ${LEVEL_NAMES[setup.level]}`;

  // Swipe-to-steer (left/right) and swipe-up-to-jump over the whole play area.
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipe.current || swipe.current.id !== e.pointerId) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    if (dy <= -SWIPE_UP_PX && Math.abs(dy) > Math.abs(dx)) {
      jump();
      swipe.current = null;
    } else if (Math.abs(dx) >= SWIPE_PX) {
      if (dx < 0) moveLeft();
      else moveRight();
      swipe.current = null;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    // A quick tap (no swipe) also jumps - the most natural phone gesture.
    if (swipe.current && swipe.current.id === e.pointerId) {
      const dx = Math.abs(e.clientX - swipe.current.x);
      const dy = Math.abs(e.clientY - swipe.current.y);
      if (dx < 10 && dy < 10) jump();
    }
    swipe.current = null;
  };

  const riding = phase === "riding";
  // Wall clock reconstructed from the store's 100 ms ticker (keeps renders pure).
  const now = startedAt + (ROUND_SECONDS - timeLeft) * 1000;

  return (
    <GameShell
      scene={
        <>
          <DeliveryScene character={character} color={color} hairColor={hairColor} bikeSkin={bikeSkin} />
          {riding && (
            <Box
              aria-hidden
              sx={{ position: "absolute", inset: 0, touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (swipe.current = null)}
            />
          )}
        </>
      }
      top={
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <QuitButton onQuit={() => router.push("/adventure")} />
              <SettingsToggles size="small" />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TimerPill seconds={riding ? timeLeft : ROUND_SECONDS} />
              <ScorePill score={score} />
            </Stack>
          </Stack>
          {riding && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center", minHeight: 40 }}>
              {shield && powerUp?.kind !== "shield" && <PowerUpChip kind="shield" until={Infinity} now={now} />}
              {powerUp && <PowerUpChip kind={powerUp.kind} until={powerUp.until} now={now} />}
              <ComboMeter combo={combo} every={COMBO_EVERY} />
            </Stack>
          )}
        </Stack>
      }
      bottom={riding ? <TouchControls onLeft={moveLeft} onRight={moveRight} onJump={jump} /> : undefined}
      overlay={
        <>
          <FlashOverlay />
          <ScorePopups />
          {phase === "intro" && (
            <IntroCard
              title="🛵 Bike Delivery"
              badge={levelLabel}
              accent={C.blue}
              lines={[
                "Ride through town and hit the glowing mailboxes to deliver pizzas.",
                "Swipe or tap the arrows to change lanes. Tap the screen or swipe up to jump!",
                "Dodge cones and puddles, hop over barriers. You have 60 seconds.",
                "Grab stars for a magnet, shield or turbo boost.",
                ...(setup.isDaily ? ["Everyone rides the same street today. Beat the world!"] : []),
                ...(setup.level > 1 && !setup.isDaily ? [`Level ${setup.level}: faster bike, more cones!`] : []),
              ]}
              cta="Start riding"
              onStart={onStart}
            />
          )}
          {phase === "countdown" && <CountdownOverlay onDone={onCountdownDone} />}
        </>
      }
    />
  );
}

export default function DeliveryGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
