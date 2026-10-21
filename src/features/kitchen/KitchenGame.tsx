"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RequirePlayer from "@/components/RequirePlayer";
import { useRoundMusic } from "@/components/MusicDirector";
import { CountdownOverlay, FlashOverlay, QuitButton, ScorePopups } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";
import { LEVEL_NAMES } from "@/features/player/progress";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { fx, useJuice } from "@/lib/fx";
import HowToPlay from "./components/HowToPlay";
import KitchenMenu from "./components/KitchenMenu";
import OrderTickets from "./components/OrderTickets";
import PauseOverlay from "./components/PauseOverlay";
import RotateOverlay from "./components/RotateOverlay";
import ShiftStatus from "./components/ShiftStatus";
import ShopPanel from "./components/ShopPanel";
import TouchPad from "./components/TouchPad";
import { ALL_INGREDIENTS } from "./content/ingredients";
import { BASE_MODS, modsFor } from "./content/shop";
import { KitchenEngine, type EngineOptions } from "./engine/KitchenEngine";
import type { ShiftSummary } from "./engine/types";
import { bindKitchenFx } from "./fx";
import { KeyboardPads, SOLO_KEYS, type PadAction } from "./input/keyboard";
import { canLockLandscape, enterLandscape, exitLandscape } from "./landscape";
import { useKitchenProgress } from "./progress";
import type { ChefLook } from "./render/Chefs";
import { unlockedIngredients } from "./shopRules";
import { useKitchenHud } from "./useKitchenHud";

const KitchenScene = dynamic(() => import("./render/KitchenScene"), { ssr: false });

type UiPhase = "menu" | "countdown" | "playing" | "closed";

const P1 = N.brand;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function ShiftOverCard({ summary, onResults }: { summary: ShiftSummary; onResults: () => void }) {
  const s = summary.stats;
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 6, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(5,8,13,0.65)" }}>
      <Panel accent={N.sun} padding={2.5} sx={{ maxWidth: 380, width: "100%" }}>
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h2" component="h2" sx={{ color: N.sun }}>
            Closing time!
          </Typography>
          <Stack direction="row" spacing={0.5} aria-label={`${summary.stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <StarRoundedIcon
                key={i}
                sx={{
                  fontSize: 48,
                  color: i < summary.stars ? N.sun : N.panelEdge,
                  filter: i < summary.stars ? `drop-shadow(0 0 10px ${N.sun})` : undefined,
                  animation: i < summary.stars ? `starIn 500ms ${i * 220}ms both cubic-bezier(.2,1.6,.4,1)` : undefined,
                  "@keyframes starIn": { from: { transform: "scale(0) rotate(-90deg)" }, to: { transform: "none" } },
                }}
              />
            ))}
          </Stack>
          <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontSize: "2.2rem", lineHeight: 1 }}>
            {summary.score}
          </Typography>
          <Typography sx={{ color: N.textSoft }}>
            {plural(s.correct, "correct pizza")} · {plural(s.perfectBakes, "golden crust")} · best streak {summary.bestCombo}
          </Typography>
          <Typography sx={{ color: N.sun, fontWeight: 800, fontSize: "1.15rem" }}>+🪙 {summary.coins} for the shop</Typography>
          <Button size="large" fullWidth variant="contained" color="success" onClick={onResults} autoFocus>
            See results
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}

function Inner() {
  const router = useRouter();
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const hairColor = usePlayerStore((s) => s.hairColor);
  const skinColor = usePlayerStore((s) => s.skinColor);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const setup = useRoundSetup("kitchen");
  const ingredients = useKitchenProgress((s) => s.ingredients);
  const upgrades = useKitchenProgress((s) => s.upgrades);
  const coins = useKitchenProgress((s) => s.coins);
  const credit = useKitchenProgress((s) => s.credit);
  const touch = useMediaQuery("(hover: none), (pointer: coarse)");
  const compact = useMediaQuery("(max-width: 700px)");
  const short = useMediaQuery("(max-height: 520px)");
  const portrait = useMediaQuery("(orientation: portrait)");
  /** Phones and tablets play sideways; upright shows the rotate screen. */
  const needsRotate = touch && portrait;
  const [canLock] = useState(canLockLandscape);

  const engineOptions = useMemo<EngineOptions>(
    () => ({
      level: setup.level,
      seed: setup.seed,
      chefs: 1,
      unlocked: setup.isDaily ? ALL_INGREDIENTS : unlockedIngredients({ ingredients }),
      mods: setup.isDaily ? BASE_MODS : modsFor(upgrades),
    }),
    [setup.level, setup.seed, setup.isDaily, ingredients, upgrades],
  );
  const [engine] = useState(() => new KitchenEngine(engineOptions));
  const [ui, setUi] = useState<UiPhase>("menu");
  useRoundMusic(ui === "countdown" || ui === "playing", "kitchen");
  const [shopOpen, setShopOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [preview, setPreview] = useState(() => ({ menu: engine.state.menu, starTargets: engine.state.starTargets }));
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const padsRef = useRef<KeyboardPads | null>(null);
  const touchStick = useRef({ x: 0, z: 0 });
  const roundIdRef = useRef("");
  const helpOpenRef = useRef(false);
  /** True when help was opened from the pause menu, so closing it stays paused. */
  const helpPausedRef = useRef(false);

  const phase = useKitchenHud((s) => s.phase);
  const orders = useKitchenHud((s) => s.orders);
  const focusAll = useKitchenHud((s) => s.focus);
  const focus = focusAll[0] ?? null;

  // Keep the menu preview (today's recipes, star targets) in sync with the kitchen behind it.
  useEffect(
    () =>
      engine.events.on((e) => {
        if (e.type === "reset") setPreview({ menu: engine.state.menu, starTargets: engine.state.starTargets });
      }),
    [engine],
  );

  // Rebuild the kitchen whenever we're back on the menu or the shop changed what's stocked.
  useEffect(() => {
    if (ui === "menu") engine.reset(engineOptions);
  }, [ui, engine, engineOptions]);

  const onShiftOver = useEffectEvent(() => {
    const s = engine.summary();
    const st = s.stats;
    setSummary(s);
    setUi("closed");
    credit(s.coins, s.score);
    finishRound({
      mode: "kitchen",
      score: s.score,
      durationSeconds: s.durationSeconds,
      roundId: roundIdRef.current,
      level: setup.level,
      challengeDate: setup.challengeDate,
      stars: s.stars,
      metrics: {
        orders: st.served,
        correct: st.correct,
        wrong: st.wrongPizzas + st.wrongToppings,
        wrongPizzas: st.wrongPizzas,
        perfectBakes: st.perfectBakes,
        speedy: st.speedy,
        abandoned: st.walkouts,
        rushPerfect: st.rushPerfect,
        burnt: st.burnt,
        bestCombo: s.bestCombo,
        coop: 0,
        coins: s.coins,
      },
      highlights: [
        { label: "Correct pizzas", value: `${st.correct}/${st.served}` },
        { label: "Perfect bakes", value: String(st.perfectBakes) },
        { label: "Best combo", value: `x${s.bestCombo}` },
        ...(st.walkouts > 0 ? [{ label: "Customers who left", value: String(st.walkouts) }] : []),
        { label: "Coins earned", value: `🪙 ${s.coins}` },
      ],
    });
  });

  // Engine -> HUD store, sound/popups and the end of the shift.
  useEffect(() => {
    engine.onHud((hud) => useKitchenHud.getState().set(hud));
    const unbindFx = bindKitchenFx(engine);
    const off = engine.events.on((e) => {
      if (e.type === "shiftOver") onShiftOver();
    });
    return () => {
      engine.onHud(null);
      unbindFx();
      off();
      useKitchenHud.getState().clear();
      useJuice.getState().clear();
    };
  }, [engine]);

  const stickFor = useCallback((slot: number) => {
    const k = padsRef.current?.stick(slot) ?? { x: 0, z: 0 };
    if (slot === 0 && (touchStick.current.x || touchStick.current.z)) return touchStick.current;
    return k;
  }, []);

  const act = useCallback(
    (_slot: number, a: PadAction) => {
      if (a === "swap") return;
      engine.command({ type: a, chef: 0 });
    },
    [engine],
  );

  const openHelp = useCallback(() => {
    helpPausedRef.current = engine.state.phase === "paused";
    if (ui === "playing" && engine.state.phase === "playing") engine.pause();
    helpOpenRef.current = true;
    setHelpOpen(true);
  }, [engine, ui]);

  const closeHelp = useCallback(() => {
    const resume = ui === "playing" && !helpPausedRef.current;
    helpOpenRef.current = false;
    setHelpOpen(false);
    if (resume) engine.resume();
  }, [engine, ui]);
  const closeHelpFromKeys = useEffectEvent(() => {
    closeHelp();
  });

  // Keyboard while the kitchen is open, plus auto-pause when the tab loses focus.
  useEffect(() => {
    if (ui !== "playing") return;
    const pads = new KeyboardPads([SOLO_KEYS], {
      move: (_slot, x, z) => engine.command({ type: "move", chef: 0, x, z }),
      action: act,
      pause: () => {
        if (helpOpenRef.current) closeHelpFromKeys();
        else engine.togglePause();
      },
    });
    padsRef.current = pads;
    const unbind = pads.bind(window);
    const offResume = engine.events.on((e) => {
      if (e.type !== "resumed") return;
      const s = stickFor(0);
      engine.command({ type: "move", chef: 0, x: s.x, z: s.z });
    });
    const onHide = () => {
      if (document.hidden) engine.pause();
    };
    const onBlur = () => engine.pause();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      unbind();
      offResume();
      padsRef.current = null;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [ui, engine, act, stickFor]);

  // Hold the shift while the device is upright; the pause menu greets them when they turn back.
  useEffect(() => {
    if (needsRotate && ui === "playing") engine.pause();
  }, [needsRotate, ui, engine]);

  useEffect(() => () => exitLandscape(), []);

  const startCountdown = () => {
    fx.unlock();
    if (touch) void enterLandscape();
    useJuice.getState().clear();
    touchStick.current = { x: 0, z: 0 };
    roundIdRef.current = `kitchen-${Date.now()}`;
    setShopOpen(false);
    setUi("countdown");
  };

  const onCountdownDone = useCallback(() => {
    engine.start();
    setUi("playing");
  }, [engine]);

  const restart = () => {
    engine.reset(engineOptions);
    startCountdown();
  };

  const quit = () => router.push("/adventure");
  const toResults = useCallback(() => router.replace("/results"), [router]);

  useEffect(() => {
    if (ui !== "closed") return;
    const t = setTimeout(toResults, 7000);
    return () => clearTimeout(t);
  }, [ui, toResults]);

  const looks = useMemo<ChefLook[]>(() => [{ character, color, hairColor, skinColor, marker: P1, active: true }], [character, color, hairColor, skinColor]);

  const playing = ui === "playing";
  const inShift = ui !== "menu";
  const paused = playing && phase === "paused";
  const showPad = touch && playing;
  // Landscape phones fill the screen with the kitchen. Tickets and the touch pad float on top of it.
  const phoneLandscape = touch && !portrait;
  const insets = useMemo(
    () => (phoneLandscape ? { top: 0.02, bottom: 0, fill: true } : { top: compact ? 0.24 : short ? 0.22 : 0.19, bottom: showPad ? 0.08 : 0.03 }),
    [phoneLandscape, compact, short, showPad],
  );
  const levelLabel = setup.isDaily ? "📅 Daily challenge" : `Level ${setup.level} · ${LEVEL_NAMES[setup.level]}`;

  return (
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: N.bg, userSelect: "none" }}>
      <Box sx={{ position: "absolute", inset: 0 }}>
        <KitchenScene engine={engine} looks={looks} insets={insets} />
      </Box>

      {/* Top bar: controls, ticket rail and shift status */}
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, p: 1, pt: "max(8px, env(safe-area-inset-top))", zIndex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <Stack spacing={0.5}>
            <QuitButton onQuit={quit} />
            {playing && (
              <>
                <IconButton aria-label="Pause" onClick={() => engine.togglePause()} sx={{ width: 46, height: 46 }}>
                  <PauseRoundedIcon />
                </IconButton>
                <IconButton aria-label="How to play" onClick={openHelp} sx={{ width: 46, height: 46 }}>
                  <InfoOutlinedIcon />
                </IconButton>
              </>
            )}
          </Stack>
          {!compact && inShift && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <OrderTickets orders={orders} focus={focus} compact={short} />
            </Box>
          )}
          {(compact || !inShift) && <Box sx={{ flex: 1 }} />}
          {inShift && <ShiftStatus />}
        </Stack>
        {compact && inShift && (
          <Box sx={{ mt: 0.5 }}>
            <OrderTickets orders={orders} focus={focus} compact />
          </Box>
        )}
      </Box>

      {showPad && (
        <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: 1, pb: "max(12px, env(safe-area-inset-bottom))", zIndex: 1, pointerEvents: "none", "& > *": { pointerEvents: "auto" } }}>
          <TouchPad
            canSwap={false}
            disabled={paused}
            onMove={(x, z) => {
              touchStick.current = { x, z };
              engine.command({ type: "move", chef: 0, x, z });
            }}
            onAction={(a) => act(0, a)}
          />
        </Box>
      )}

      <FlashOverlay />
      <ScorePopups />

      {ui === "menu" && !shopOpen && (
        <KitchenMenu
          levelLabel={levelLabel}
          isDaily={setup.isDaily}
          menu={preview.menu}
          starTargets={preview.starTargets}
          touch={touch}
          coins={coins}
          onStart={startCountdown}
          onShop={() => setShopOpen(true)}
          onHelp={openHelp}
          onClose={quit}
        />
      )}
      {ui === "menu" && shopOpen && <ShopPanel isDaily={setup.isDaily} onClose={() => setShopOpen(false)} />}
      {ui === "countdown" && <CountdownOverlay onDone={onCountdownDone} />}
      {paused && !helpOpen && <PauseOverlay onResume={() => engine.resume()} onRestart={restart} onQuit={quit} onHelp={openHelp} />}
      {helpOpen && <HowToPlay touch={touch} captureEscape={ui !== "playing"} onClose={closeHelp} />}
      {ui === "closed" && summary && <ShiftOverCard summary={summary} onResults={toResults} />}
      {needsRotate && <RotateOverlay canLock={canLock} onLock={() => void enterLandscape()} onQuit={quit} />}
    </Box>
  );
}

export default function KitchenGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
