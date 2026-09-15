"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import GameShell from "@/components/GameShell";
import RequirePlayer from "@/components/RequirePlayer";
import { CountdownOverlay, FeedbackToast, IntroCard, QuitButton, ScorePill } from "@/components/HUD";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { LEVEL_NAMES } from "@/features/player/progress";
import { BAKE_ZONES, TOPPINGS, isOrderComplete, maxScore, TOPPING_BY_ID } from "./scoring";
import { useKitchenGame } from "./useKitchenGame";

const KitchenScene = dynamic(() => import("./KitchenScene"), { ssr: false });

function BakeMeter({ progress }: { progress: number }) {
  const pct = (v: number) => `${v * 100}%`;
  return (
    <Box sx={{ position: "relative", height: 26, borderRadius: 999, overflow: "hidden", bgcolor: "#E5E7EB" }}>
      <Box sx={{ position: "absolute", top: 0, bottom: 0, left: pct(BAKE_ZONES.okStart), width: pct(BAKE_ZONES.okEnd - BAKE_ZONES.okStart), bgcolor: "#FDE68A" }} />
      <Box sx={{ position: "absolute", top: 0, bottom: 0, left: pct(BAKE_ZONES.perfectStart), width: pct(BAKE_ZONES.perfectEnd - BAKE_ZONES.perfectStart), bgcolor: "#3FA34D" }} />
      <Box sx={{ position: "absolute", top: 0, bottom: 0, left: pct(BAKE_ZONES.okEnd), right: 0, bgcolor: "#F2542D" }} />
      <Box
        sx={{
          position: "absolute",
          top: -2,
          bottom: -2,
          left: `calc(${pct(progress)} - 4px)`,
          width: 8,
          borderRadius: 4,
          bgcolor: "#2B2D42",
          boxShadow: "0 0 0 2px #fff",
        }}
      />
    </Box>
  );
}

function Inner() {
  const router = useRouter();
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const setup = useRoundSetup("kitchen");

  const phase = useKitchenGame((s) => s.phase);
  const config = useKitchenGame((s) => s.config);
  const orders = useKitchenGame((s) => s.orders);
  const orderIndex = useKitchenGame((s) => s.orderIndex);
  const placed = useKitchenGame((s) => s.placed);
  const wrongPlaced = useKitchenGame((s) => s.wrongPlaced);
  const score = useKitchenGame((s) => s.score);
  const bakeProgress = useKitchenGame((s) => s.bakeProgress);
  const feedback = useKitchenGame((s) => s.feedback);
  const stats = useKitchenGame((s) => s.stats);
  const startedAt = useKitchenGame((s) => s.startedAt);
  const begin = useKitchenGame((s) => s.begin);
  const startRound = useKitchenGame((s) => s.startRound);
  const addTopping = useKitchenGame((s) => s.addTopping);
  const startBaking = useKitchenGame((s) => s.startBaking);
  const takeOut = useKitchenGame((s) => s.takeOut);
  const reset = useKitchenGame((s) => s.reset);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (phase !== "finished") return;
    finishRound({
      mode: "kitchen",
      score,
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      roundId: `kitchen-${startedAt}`,
      level: config.level,
      challengeDate: config.challengeDate,
      highlights: [
        { label: "Toppings right", value: String(stats.correct) },
        { label: "Perfect bakes", value: `${stats.perfectBakes}/${orders.length}` },
        { label: "Max possible", value: String(maxScore(orders)) },
      ],
    });
    router.replace("/results");
  }, [phase, score, stats, startedAt, orders, config, finishRound, router]);

  const onCountdownDone = useCallback(() => startRound(), [startRound]);
  const onStart = useCallback(
    () => begin({ level: setup.level, seed: setup.seed, challengeDate: setup.challengeDate }),
    [begin, setup.level, setup.seed, setup.challengeDate],
  );
  const levelLabel = setup.isDaily ? "Daily challenge" : `Level ${setup.level} · ${LEVEL_NAMES[setup.level]}`;
  const order = orders[orderIndex];
  const complete = order ? isOrderComplete(order, placed) : false;
  const playing = phase === "topping" || phase === "baking" || phase === "served";

  return (
    <GameShell
      scene={<KitchenScene character={character} color={color} />}
      top={
        <Stack spacing={1}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <QuitButton onQuit={() => router.push("/adventure")} />
            <ScorePill score={score} />
          </Stack>
          {playing && order && (
            <Paper sx={{ p: 1.5, borderRadius: 4 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <Typography variant="h4">Order {order.id}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {orderIndex + 1} of {orders.length}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.75, flexWrap: "wrap" }}>
                {order.toppings.map((t) => {
                  const done = placed.includes(t);
                  return (
                    <Chip
                      key={t}
                      size="small"
                      icon={done ? <CheckRoundedIcon /> : undefined}
                      label={`${TOPPING_BY_ID[t].emoji} ${TOPPING_BY_ID[t].label}`}
                      color={done ? "success" : "default"}
                      variant={done ? "filled" : "outlined"}
                    />
                  );
                })}
                {wrongPlaced.map((t, i) => (
                  <Chip key={`${t}-${i}`} size="small" label={`${TOPPING_BY_ID[t].emoji} oops`} color="error" />
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      }
      bottom={
        playing ? (
          <Paper sx={{ p: 1.5, borderRadius: 5 }}>
            {phase === "topping" && (
              <Stack spacing={1.25}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                  {TOPPINGS.map((t) => (
                    <ButtonBase
                      key={t.id}
                      onClick={() => addTopping(t.id)}
                      aria-label={`Add ${t.label}`}
                      sx={{
                        flexDirection: "column",
                        py: 1,
                        borderRadius: 3,
                        bgcolor: placed.includes(t.id) ? "#E8F5E9" : "#FFF7EC",
                        border: "2px solid",
                        borderColor: order?.toppings.includes(t.id) && !placed.includes(t.id) ? "#F2542D" : "transparent",
                        "&:active": { transform: "scale(0.95)" },
                      }}
                    >
                      <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{t.emoji}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>
                        {t.label}
                      </Typography>
                    </ButtonBase>
                  ))}
                </Box>
                <Button size="large" variant="contained" disabled={!complete} onClick={startBaking}>
                  {complete ? "Into the oven!" : "Add the toppings first"}
                </Button>
              </Stack>
            )}
            {phase === "baking" && (
              <Stack spacing={1.25}>
                <Typography sx={{ textAlign: "center", fontWeight: 800 }}>Take it out in the green!</Typography>
                <BakeMeter progress={bakeProgress} />
                <Button size="large" variant="contained" color="secondary" onClick={takeOut}>
                  Take it out!
                </Button>
              </Stack>
            )}
            {phase === "served" && (
              <Typography variant="h4" sx={{ textAlign: "center", py: 1 }}>
                Order up! 🍕
              </Typography>
            )}
          </Paper>
        ) : undefined
      }
      overlay={
        <>
          <FeedbackToast key={feedback?.id} message={feedback?.text ?? null} tone={feedback?.tone ?? "neutral"} />
          {phase === "intro" && (
            <IntroCard
              title="Pizza Kitchen"
              badge={levelLabel}
              lines={[
                "Read the order card and tap the toppings it asks for.",
                "Wrong toppings cost points!",
                "Then bake it and take it out when the meter is green.",
                ...(setup.isDaily ? ["Everyone gets the same orders today. Beat the world!"] : []),
                ...(setup.level > 1 && !setup.isDaily ? [`Level ${setup.level}: more orders and a faster oven!`] : []),
              ]}
              cta="Start cooking"
              onStart={onStart}
            />
          )}
          {phase === "countdown" && <CountdownOverlay onDone={onCountdownDone} />}
        </>
      }
    />
  );
}

export default function KitchenGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
