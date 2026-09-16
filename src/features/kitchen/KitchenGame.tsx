"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import GameShell from "@/components/GameShell";
import RequirePlayer from "@/components/RequirePlayer";
import { CountdownOverlay, FlashOverlay, IntroCard, PatienceBar, QuitButton, ScorePill, ScorePopups, SettingsToggles } from "@/components/HUD";
import SpeechBubble from "@/components/ui/SpeechBubble";
import TileButton from "@/components/ui/TileButton";
import { C, RADIUS, floatShadow } from "@/design/tokens";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { LEVEL_NAMES } from "@/features/player/progress";
import { BAKE_ZONES, TOPPINGS, isOrderComplete, kitchenStars, maxScore, TOPPING_BY_ID } from "./scoring";
import { useKitchenGame } from "./useKitchenGame";

const KitchenScene = dynamic(() => import("./KitchenScene"), { ssr: false });

/** Oven timing bar: burnt at the end, green in the sweet spot. */
function BakeMeter({ progress }: { progress: number }) {
  const pct = (v: number) => `${v * 100}%`;
  const inPerfect = progress >= BAKE_ZONES.perfectStart && progress <= BAKE_ZONES.perfectEnd;
  return (
    <Box
      sx={{
        position: "relative",
        height: 30,
        borderRadius: 999,
        overflow: "hidden",
        bgcolor: C.slate,
        boxShadow: inPerfect ? `0 0 0 4px ${C.money}` : "inset 0 2px 0 rgba(22,33,46,0.10)",
        transition: "box-shadow 80ms",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, left: pct(BAKE_ZONES.okStart), right: pct(1 - BAKE_ZONES.okEnd), bgcolor: C.sun }} />
      <Box sx={{ position: "absolute", inset: 0, left: pct(BAKE_ZONES.perfectStart), right: pct(1 - BAKE_ZONES.perfectEnd), bgcolor: C.money }} />
      <Box sx={{ position: "absolute", inset: 0, left: pct(BAKE_ZONES.okEnd), right: 0, bgcolor: C.tomato }} />
      <Box
        sx={{
          position: "absolute",
          top: -3,
          bottom: -3,
          left: `calc(${pct(progress)} - 5px)`,
          width: 10,
          borderRadius: 5,
          bgcolor: C.ink,
          boxShadow: `0 0 0 3px ${C.white}`,
        }}
      />
    </Box>
  );
}

/** One requested topping as a disc; ticks off as it lands on the pizza. */
function ToppingDisc({ emoji, done, wrong = false }: { emoji: string; done?: boolean; wrong?: boolean }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: 42,
        height: 42,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: 22,
        lineHeight: 1,
        bgcolor: wrong ? C.tomato : done ? C.money : C.sandSoft,
        boxShadow: `0 3px 0 ${wrong ? C.tomatoDeep : done ? C.moneyDeep : C.sandDeep}`,
        filter: wrong ? "grayscale(0.4)" : "none",
      }}
    >
      {emoji}
      {(done || wrong) && (
        <Box
          sx={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            bgcolor: wrong ? C.tomatoDeep : C.moneyDeep,
            display: "grid",
            placeItems: "center",
            border: `2px solid ${C.white}`,
          }}
        >
          {wrong ? (
            <CloseRoundedIcon sx={{ fontSize: 12, color: C.white }} />
          ) : (
            <CheckRoundedIcon sx={{ fontSize: 12, color: C.white }} />
          )}
        </Box>
      )}
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
  const patience = useKitchenGame((s) => s.patience);
  const lastBake = useKitchenGame((s) => s.lastBake);
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
      stars: kitchenStars(score, orders),
      metrics: {
        orders: orders.length,
        correct: stats.correct,
        wrong: stats.wrong,
        perfectBakes: stats.perfectBakes,
        okBakes: stats.okBakes,
        speedy: stats.speedy,
        abandoned: stats.abandoned,
        rushPerfect: stats.rushPerfect,
      },
      highlights: [
        { label: "Toppings right", value: String(stats.correct) },
        { label: "Perfect bakes", value: `${stats.perfectBakes}/${orders.length}` },
        ...(stats.speedy > 0 ? [{ label: "Speedy bonuses", value: String(stats.speedy) }] : []),
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
  const levelLabel = setup.isDaily ? "📅 Daily challenge" : `Level ${setup.level} · ${LEVEL_NAMES[setup.level]}`;
  const order = orders[orderIndex];
  const complete = order ? isOrderComplete(order, placed) : false;
  const playing = phase === "topping" || phase === "baking" || phase === "served";
  const hasTimer = !!order && order.patienceMs > 0;

  return (
    <GameShell
      scene={<KitchenScene character={character} color={color} />}
      top={
        <Stack spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <Stack direction="row" sx={{ width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <QuitButton onQuit={() => router.push("/adventure")} />
              <SettingsToggles size="small" />
            </Stack>
            <ScorePill score={score} />
          </Stack>
          {playing && order && (
            <SpeechBubble
              tail="bottom"
              tone={order.rush ? C.tomato : C.white}
              sx={{
                display: "block",
                alignSelf: "flex-start",
                width: "fit-content",
                minWidth: 220,
                maxWidth: 360,
                px: 1.75,
                py: 1.5,
                color: order.rush ? C.white : C.ink,
                animation: order.rush && phase === "topping" ? "rushGlow 900ms ease-in-out infinite" : undefined,
                "@keyframes rushGlow": {
                  "0%,100%": { boxShadow: floatShadow },
                  "50%": { boxShadow: `0 0 0 6px rgba(239,81,54,0.35), ${floatShadow}` },
                },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Typography variant="h4">Order {order.id}</Typography>
                  {order.rush && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1,
                        height: 26,
                        borderRadius: 999,
                        bgcolor: C.sun,
                        color: C.ink,
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                      }}
                    >
                      <BoltRoundedIcon sx={{ fontSize: 16 }} /> 2x
                    </Box>
                  )}
                </Stack>
                <Typography
                  className="tnum"
                  variant="caption"
                  sx={{ color: order.rush ? "rgba(255,255,255,0.9)" : C.inkSoft }}
                >
                  {orderIndex + 1} / {orders.length}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                {order.toppings.map((t) => (
                  <ToppingDisc key={t} emoji={TOPPING_BY_ID[t].emoji} done={placed.includes(t)} />
                ))}
                {wrongPlaced.map((t, i) => (
                  <ToppingDisc key={`${t}-${i}`} emoji={TOPPING_BY_ID[t].emoji} wrong />
                ))}
              </Stack>
              {hasTimer && phase === "topping" && (
                <Box sx={{ mt: 1.25 }}>
                  <PatienceBar value={patience} />
                </Box>
              )}
            </SpeechBubble>
          )}
        </Stack>
      }
      bottom={
        playing ? (
          <Box sx={{ bgcolor: C.white, borderRadius: `${RADIUS.panel}px`, boxShadow: floatShadow, p: 1.5 }}>
            {phase === "topping" && (
              <Stack spacing={1.5}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                  {TOPPINGS.map((t) => {
                    // `placed` also records mistakes, so split the two states:
                    // green means "on the order and done", red means "oops".
                    const done = placed.includes(t.id);
                    const inOrder = !!order?.toppings.includes(t.id);
                    return (
                      <TileButton
                        key={t.id}
                        tone={done ? (inOrder ? "money" : "tomato") : "sand"}
                        wanted={inOrder && !done}
                        ariaLabel={`Add ${t.label}`}
                        onClick={(e) =>
                          addTopping(t.id, {
                            x: e.clientX / window.innerWidth,
                            y: e.clientY / window.innerHeight - 0.08,
                          })
                        }
                      >
                        <Typography sx={{ fontSize: 30, lineHeight: 1 }} aria-hidden>
                          {t.emoji}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
                          {t.label}
                        </Typography>
                      </TileButton>
                    );
                  })}
                </Box>
                <Button
                  size="large"
                  variant="contained"
                  color="success"
                  disabled={!complete}
                  onClick={startBaking}
                  sx={{
                    animation: complete ? "readyPulse 900ms ease-in-out infinite" : undefined,
                    "@keyframes readyPulse": { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.03)" } },
                  }}
                >
                  {complete ? "🔥 Into the oven!" : "Add the toppings first"}
                </Button>
              </Stack>
            )}
            {phase === "baking" && (
              <Stack spacing={1.5}>
                <Typography sx={{ textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800 }}>
                  Take it out in the green!
                </Typography>
                <BakeMeter progress={bakeProgress} />
                <Button size="large" variant="contained" color="warning" onClick={takeOut}>
                  Take it out!
                </Button>
              </Stack>
            )}
            {phase === "served" && (
              <Typography variant="h4" sx={{ textAlign: "center", py: 1.5 }}>
                {lastBake === null ? "Next customer..." : lastBake === "perfect" ? "Perfetto! 🍕✨" : "Order up! 🍕"}
              </Typography>
            )}
          </Box>
        ) : undefined
      }
      overlay={
        <>
          <FlashOverlay />
          <ScorePopups />
          {phase === "intro" && (
            <IntroCard
              title="🍕 Pizza Kitchen"
              badge={levelLabel}
              accent={C.tomato}
              lines={[
                "Read the order card and tap the toppings it asks for.",
                "Wrong toppings cost points!",
                "Then bake it and take it out when the meter is green.",
                ...(setup.level >= 2 || setup.isDaily ? ["Customers won't wait forever - be quick for a speedy bonus!"] : []),
                ...(setup.level >= 3 || setup.isDaily ? ["Rush orders pay double."] : []),
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
