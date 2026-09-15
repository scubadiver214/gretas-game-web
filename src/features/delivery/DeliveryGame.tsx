"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import GameShell from "@/components/GameShell";
import RequirePlayer from "@/components/RequirePlayer";
import TouchControls from "@/components/TouchControls";
import { CountdownOverlay, FeedbackToast, IntroCard, QuitButton, ScorePill, TimerPill } from "@/components/HUD";
import { usePlayerStore } from "@/features/player/store";
import { ROUND_SECONDS } from "./scoring";
import { useDeliveryGame } from "./useDeliveryGame";

const DeliveryScene = dynamic(() => import("./DeliveryScene"), { ssr: false });

const SWIPE_PX = 28;

function Inner() {
  const router = useRouter();
  const character = usePlayerStore((s) => s.character)!;
  const setLastResult = usePlayerStore((s) => s.setLastResult);

  const phase = useDeliveryGame((s) => s.phase);
  const score = useDeliveryGame((s) => s.score);
  const combo = useDeliveryGame((s) => s.combo);
  const bestCombo = useDeliveryGame((s) => s.bestCombo);
  const deliveries = useDeliveryGame((s) => s.deliveries);
  const hits = useDeliveryGame((s) => s.hits);
  const timeLeft = useDeliveryGame((s) => s.timeLeft);
  const feedback = useDeliveryGame((s) => s.feedback);
  const startedAt = useDeliveryGame((s) => s.startedAt);
  const begin = useDeliveryGame((s) => s.begin);
  const startRide = useDeliveryGame((s) => s.startRide);
  const moveLeft = useDeliveryGame((s) => s.moveLeft);
  const moveRight = useDeliveryGame((s) => s.moveRight);
  const reset = useDeliveryGame((s) => s.reset);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (phase !== "finished") return;
    setLastResult({
      mode: "delivery",
      score,
      durationSeconds: ROUND_SECONDS,
      roundId: `delivery-${startedAt}`,
      highlights: [
        { label: "Pizzas delivered", value: String(deliveries) },
        { label: "Best combo", value: String(bestCombo) },
        { label: "Bumps", value: String(hits) },
      ],
    });
    router.replace("/results");
  }, [phase, score, deliveries, bestCombo, hits, startedAt, setLastResult, router]);

  const onCountdownDone = useCallback(() => startRide(), [startRide]);

  // Swipe-to-steer over the whole play area.
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipe.current || swipe.current.id !== e.pointerId) return;
    const dx = e.clientX - swipe.current.x;
    if (Math.abs(dx) >= SWIPE_PX) {
      if (dx < 0) moveLeft();
      else moveRight();
      swipe.current = null;
    }
  };
  const onPointerUp = () => {
    swipe.current = null;
  };

  const riding = phase === "riding";

  return (
    <GameShell
      scene={
        <>
          <DeliveryScene character={character} />
          {riding && (
            <Box
              aria-hidden
              sx={{ position: "absolute", inset: 0, touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </>
      }
      top={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <QuitButton onQuit={() => router.push("/adventure")} />
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {combo >= 2 && <Chip label={`x${combo} combo`} color="secondary" sx={{ height: 40, fontSize: "1rem" }} />}
            <TimerPill seconds={riding ? timeLeft : ROUND_SECONDS} />
            <ScorePill score={score} />
          </Stack>
        </Stack>
      }
      bottom={riding ? <TouchControls onLeft={moveLeft} onRight={moveRight} /> : undefined}
      overlay={
        <>
          <FeedbackToast key={feedback?.id} message={feedback?.text ?? null} tone={feedback?.tone ?? "neutral"} />
          {phase === "intro" && (
            <IntroCard
              title="Bike Delivery"
              lines={[
                "Ride through town and hit the glowing mailboxes to deliver pizzas.",
                "Swipe or tap the arrows to change lanes.",
                "Dodge cones and puddles! You have 60 seconds.",
              ]}
              cta="Start riding"
              onStart={begin}
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
