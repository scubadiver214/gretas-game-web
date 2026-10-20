"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import RequirePlayer from "@/components/RequirePlayer";
import { CountdownOverlay, FlashOverlay, QuitButton, ScorePopups, SettingsToggles } from "@/components/HUD";
import { N } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { usePersonalBests } from "@/features/scores/hooks";
import { celebrate, fx, music, useJuice } from "@/lib/fx";
import { bindFroggerFx } from "./audio";
import { startSession } from "./api";
import DPad from "./components/DPad";
import FroggerCanvas from "./components/FroggerCanvas";
import { ScoreAndBest, StatusRow, TimerBar } from "./components/FroggerHud";
import GameOverPanel, { type SaveState } from "./components/GameOverPanel";
import MainMenu from "./components/MainMenu";
import PauseOverlay from "./components/PauseOverlay";
import { froggerStars } from "./config";
import { GameEngine } from "./engine/GameEngine";
import { bindKeyboard } from "./engine/input";
import { useCompleteSession, useFroggerStats } from "./hooks";
import type { GameSummary } from "./types";
import { useFroggerHud } from "./useFroggerHud";

/** Menu, "3-2-1" (while the session is created), the game itself, and the game-over screen. */
type UiPhase = "menu" | "loading" | "playing" | "gameOver";

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const setup = useRoundSetup("frogger");

  const [engine] = useState(() => new GameEngine({ seed: setup.seed }));
  const [ui, setUi] = useState<UiPhase>("menu");
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "saving" });
  const [offline, setOffline] = useState(false);
  /** Personal best when this game started, for the game-over comparison. */
  const [bestBefore, setBestBefore] = useState<number | undefined>(undefined);
  const enginePhase = useFroggerHud((s) => s.phase);
  const touch = useMediaQuery("(hover: none), (pointer: coarse)");

  const bests = usePersonalBests(nickname);
  const best = bests.data?.find((b) => b.mode === "frogger")?.score;
  const stats = useFroggerStats(nickname);
  const complete = useCompleteSession();

  /** Resolves to the server session id, or null if the server couldn't be reached. */
  const sessionRef = useRef<Promise<string | null>>(Promise.resolve(null));
  const roundIdRef = useRef("");

  const submit = useCallback(
    async (s: GameSummary, roundId: string) => {
      setSave({ status: "saving" });
      const sessionId = await sessionRef.current;
      if (!sessionId) {
        setSave({ status: "offline" });
        markSubmitted(roundId);
        return;
      }
      try {
        const res = await complete.mutateAsync({
          sessionId,
          body: {
            nickname,
            score: s.score,
            highestLevel: s.highestLevel,
            levelsCompleted: s.levelsCompleted,
            livesLost: s.livesLost,
            durationSeconds: s.durationSeconds,
          },
        });
        setSave({ status: "saved", ...res });
        markSubmitted(roundId, { rank: res.rank, personalBest: res.isPersonalBest });
        if (res.isPersonalBest && s.score > 0) {
          fx.best();
          void celebrate(true);
        }
      } catch {
        setSave({ status: "error" });
      }
    },
    [complete, markSubmitted, nickname],
  );

  const onGameOver = useEffectEvent(() => {
    const s = engine.summary();
    const roundId = roundIdRef.current;
    music.stop(0.8);
    setSummary(s);
    setUi("gameOver");
    finishRound({
      mode: "frogger",
      score: s.score,
      durationSeconds: s.durationSeconds,
      roundId,
      level: s.highestLevel,
      challengeDate: setup.challengeDate,
      stars: froggerStars(s.levelsCompleted, s.homesFilled),
      metrics: {
        levelsCompleted: s.levelsCompleted,
        homes: s.homesFilled,
        livesLost: s.livesLost,
        perfectLevels: s.perfectLevels,
        highestLevel: s.highestLevel,
      },
      highlights: [
        { label: "Highest level", value: String(s.highestLevel) },
        { label: "Frogs home", value: String(s.homesFilled) },
      ],
    });
    void submit(s, roundId);
  });

  // Wire the engine to the HUD store, sound/popups and the game-over flow.
  useEffect(() => {
    engine.onHud((hud) => useFroggerHud.getState().set(hud));
    const unbindFx = bindFroggerFx(engine);
    const off = engine.events.on((e) => {
      if (e.type === "gameOver") onGameOver();
    });
    return () => {
      engine.onHud(null);
      unbindFx();
      off();
      useFroggerHud.getState().clear();
      useJuice.getState().clear();
      music.stop();
    };
  }, [engine]);

  // Keyboard, and auto-pause when the tab or window loses focus.
  useEffect(() => {
    const unbind = bindKeyboard(window, (action) => {
      if (action === "pause") engine.togglePause();
      else engine.input(action);
    });
    const onHide = () => {
      if (document.hidden) engine.pause();
    };
    const onBlur = () => engine.pause();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      unbind();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [engine]);

  const play = () => {
    fx.unlock();
    engine.reset({ seed: setup.seed });
    useJuice.getState().clear();
    roundIdRef.current = `frogger-${Date.now()}`;
    setBestBefore(best);
    setOffline(false);
    setSummary(null);
    setSave({ status: "saving" });
    sessionRef.current = startSession({ nickname, character, color, challengeDate: setup.challengeDate })
      .then((r) => r.sessionId)
      .catch(() => {
        setOffline(true);
        return null;
      });
    setUi("loading");
  };

  const onCountdownDone = useCallback(() => {
    engine.start();
    setUi("playing");
    music.play("frogger");
  }, [engine]);

  const quit = () => router.push("/adventure");
  const ranks = () => router.push("/scoreboard?mode=frogger");
  const playing = ui === "playing";
  const paused = playing && enginePhase === "paused";

  return (
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: N.bg, display: "flex", flexDirection: "column", userSelect: "none" }}>
      <Stack spacing={0.75} sx={{ p: 1.25, pt: "max(10px, env(safe-area-inset-top))", zIndex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <QuitButton onQuit={quit} />
          {playing && (
            <IconButton aria-label="Pause" onClick={() => engine.togglePause()} sx={{ width: 46, height: 46 }}>
              <PauseRoundedIcon />
            </IconButton>
          )}
          {/* Phones keep the toggles in the menu and pause screen to leave room for the score. */}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <SettingsToggles size="small" />
          </Box>
          <Box sx={{ flex: 1 }} />
          <ScoreAndBest best={best ?? 0} />
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <StatusRow />
          {offline && playing && (
            <Chip
              size="small"
              icon={<CloudOffRoundedIcon />}
              label={touch ? "Offline" : "Offline: score won't be saved"}
              aria-label="Offline: score won't be saved"
              sx={{ bgcolor: N.bgRaise, color: N.textSoft, border: `1px solid ${N.panelEdge}` }}
            />
          )}
        </Stack>
      </Stack>

      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        <FroggerCanvas engine={engine} />
        <FlashOverlay />
        <ScorePopups />
        {ui === "menu" && (
          <MainMenu nickname={nickname} isDaily={setup.isDaily} best={best} stats={stats.data} onPlay={play} onRanks={ranks} />
        )}
        {ui === "loading" && <CountdownOverlay onDone={onCountdownDone} />}
        {paused && <PauseOverlay onResume={() => engine.resume()} onRestart={play} onQuit={quit} />}
        {ui === "gameOver" && summary && (
          <GameOverPanel
            summary={summary}
            save={save}
            previousBest={bestBefore}
            isDaily={setup.isDaily}
            onRetrySave={() => void submit(summary, roundIdRef.current)}
            onPlayAgain={play}
            onExit={quit}
            onRanks={ranks}
          />
        )}
      </Box>

      <Stack spacing={1} sx={{ px: 1.5, pt: 1, pb: "max(12px, env(safe-area-inset-bottom))", zIndex: 1 }}>
        <TimerBar />
        {touch && <DPad onDir={(dir) => engine.input(dir)} disabled={!playing || paused} />}
      </Stack>
    </Box>
  );
}

export default function FroggerGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
