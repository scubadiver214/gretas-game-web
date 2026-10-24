"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import { useQueryClient } from "@tanstack/react-query";
import { useRoundMusic } from "@/components/MusicDirector";
import RequirePlayer from "@/components/RequirePlayer";
import { FlashOverlay, QuitButton, ScorePopups, SettingsToggles } from "@/components/HUD";
import { N } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import { fx, useJuice } from "@/lib/fx";
import { startAttempt, type StartAttemptResponse } from "./api";
import ClawCanvas from "./components/ClawCanvas";
import ClawControls from "./components/ClawControls";
import { HintBanner, LevelAndGoal, PointsPill } from "./components/ClawHud";
import LevelClearCard from "./components/LevelClearCard";
import MachineMenu from "./components/MachineMenu";
import MysteryMenu from "./components/MysteryMenu";
import PauseOverlay from "./components/PauseOverlay";
import PrizeCelebration from "./components/PrizeCelebration";
import SaveStatusChip, { type SaveStatus } from "./components/SaveStatusChip";
import { CHEERS } from "./config";
import { levelDef, mysterySetup } from "./content/levels";
import { PRIZE_BY_ID, TOY_TEMPLATES } from "./content/prizes";
import { WORLD_BY_ID, worldFor, type WorldId } from "./content/worlds";
import { ClawEngine } from "./engine/ClawEngine";
import { MAX_LEVEL } from "./engine/difficulty";
import { bindKeyboard } from "./engine/input";
import type { LevelSummary, Rarity } from "./engine/types";
import { bindClawFx } from "./fx";
import { clawKeys, useClawOutboxFlusher, useClawProfile } from "./hooks";
import { useClawMirror } from "./mirror";
import { enqueueClawWrite, newOutboxId } from "./outbox";
import { useClawHud } from "./useClawHud";

type UiPhase = "menu" | "playing" | "celebrating" | "levelClear";

interface Celebration {
  prizeId: string;
  points: number;
  rarity: Rarity;
  cheer: string;
  count?: number;
  newAvatars: string[];
}

interface ClearState {
  summary: LevelSummary;
  newAvatars: string[];
  mysteryUnlocked: WorldId | null;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function isWorldId(value: string | null): value is WorldId {
  return value !== null && value in WORLD_BY_ID;
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const { profile, loading: profileLoading, offline: profileOffline } = useClawProfile(nickname);
  const pending = useClawOutboxFlusher(nickname);
  const applyGrab = useClawMirror((s) => s.applyGrab);
  const applyComplete = useClawMirror((s) => s.applyComplete);

  const mysteryWorld = isWorldId(params.get("mystery")) ? (params.get("mystery") as WorldId) : null;
  const requested = Number(params.get("level"));
  const [level, setLevelState] = useState(() => (Number.isFinite(requested) && requested >= 1 ? Math.min(MAX_LEVEL, Math.floor(requested)) : 1));
  const pickedRef = useRef(Number.isFinite(requested) && requested >= 1);
  // Until the player picks a level, follow the profile: open on the newest unlocked level.
  // A requested level the profile has not unlocked falls back to the newest one once the profile is known.
  useEffect(() => {
    if (mysteryWorld) return;
    if (!pickedRef.current || (!profileLoading && level > profile.currentLevel)) {
      setLevelState(Math.min(MAX_LEVEL, Math.max(1, profile.currentLevel)));
    }
  }, [profile.currentLevel, profileLoading, level, mysteryWorld]);
  const setLevel = (l: number) => {
    pickedRef.current = true;
    setLevelState(Math.min(profile.currentLevel, l));
  };

  const setup = useMemo(() => (mysteryWorld ? mysterySetup(mysteryWorld) : levelDef(level)), [level, mysteryWorld]);
  const world = useMemo(() => (mysteryWorld ? WORLD_BY_ID[mysteryWorld] : worldFor(level)), [level, mysteryWorld]);
  const starsByLevel = useMemo(() => Object.fromEntries(profile.levels.map((l) => [l.level, l.stars])) as Record<number, number>, [profile.levels]);

  const [engine] = useState(() => new ClawEngine(setup, TOY_TEMPLATES));
  const [ui, setUi] = useState<UiPhase>("menu");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [clear, setClear] = useState<ClearState | null>(null);
  const [save, setSave] = useState<SaveStatus>("saved");
  useRoundMusic(ui !== "menu");
  const hud = useClawHud();
  const touch = useMediaQuery("(hover: none), (pointer: coarse)");
  const compact = useMediaQuery("(max-width: 600px)");

  /** Resolves to the server attempt, or null when the API could not be reached. */
  const attemptRef = useRef<Promise<StartAttemptResponse | null>>(Promise.resolve(null));
  const roundIdRef = useRef("");

  // Rebuild the machine whenever we are back on the menu or the level changed.
  useEffect(() => {
    if (ui === "menu") engine.reset(setup);
  }, [ui, engine, setup]);

  /** Queues one grab for the server; resolves with the server's answer when it has been sent. */
  const sendGrab = useCallback(
    async (seq: number, prizeId: string | null, succeeded: boolean) => {
      const attempt = await attemptRef.current;
      if (!attempt) return null;
      setSave("saving");
      try {
        const result = await enqueueClawWrite({
          id: newOutboxId(),
          kind: "grab",
          attemptId: attempt.attemptId,
          nickname,
          seq,
          prizeId,
          succeeded,
          elapsedSeconds: Math.max(0, Math.round(engine.playSeconds)),
        });
        if (result.kind !== "grab") return null;
        applyGrab(nickname, attempt.level, result.response);
        setSave("saved");
        return result.response;
      } catch {
        setSave("offline");
        return null;
      }
    },
    [nickname, engine, applyGrab],
  );

  const sendComplete = useCallback(
    async (summary: LevelSummary) => {
      const attempt = await attemptRef.current;
      if (!attempt) return null;
      setSave("saving");
      try {
        const result = await enqueueClawWrite({ id: newOutboxId(), kind: "complete", attemptId: attempt.attemptId, nickname, durationSeconds: summary.durationSeconds });
        if (result.kind !== "complete") return null;
        applyComplete(nickname, attempt.level, summary.grabs, result.response);
        void qc.invalidateQueries({ queryKey: clawKeys.profile(nickname) });
        setSave("saved");
        return result.response;
      } catch {
        setSave("offline");
        return null;
      }
    },
    [nickname, applyComplete, qc],
  );

  const onPrizeDelivered = useEffectEvent((prizeId: string, points: number, rarity: Rarity) => {
    setCelebration({ prizeId, points, rarity, cheer: pick(CHEERS[rarity]), newAvatars: [] });
    setUi("celebrating");
    void sendGrab(engine.grabs, prizeId, true).then((res) => {
      if (!res) return;
      setCelebration((c) => (c && c.prizeId === prizeId ? { ...c, count: res.count, newAvatars: res.newAvatars } : c));
    });
  });
  const onMiss = useEffectEvent(() => {
    void sendGrab(engine.grabs, null, false);
  });
  const onLevelClear = useEffectEvent(() => {
    const summary = engine.summary();
    setClear({ summary, newAvatars: [], mysteryUnlocked: null });
    setUi("levelClear");
    finishRound({
      mode: "claw",
      score: summary.points,
      durationSeconds: summary.durationSeconds,
      roundId: roundIdRef.current,
      level: summary.level,
      stars: summary.stars,
      metrics: { grabs: summary.grabs, successes: summary.successes, misses: summary.misses, prizes: summary.prizes.length, mystery: mysteryWorld ? 1 : 0 },
      highlights: [
        { label: "Prizes won", value: String(summary.successes) },
        { label: "Grabs", value: String(summary.grabs) },
      ],
    });
    // The claw game has no leaderboard: the round is complete for "My runs" right away.
    markSubmitted(roundIdRef.current);
    void sendComplete(summary).then((res) => {
      if (!res) return;
      setClear((c) => (c ? { ...c, newAvatars: res.newAvatars, mysteryUnlocked: res.mysteryUnlocked } : c));
    });
  });

  // Engine -> HUD store, sound/popups, server writes and the celebration / level-clear flow.
  useEffect(() => {
    engine.onHud((h) => useClawHud.getState().set(h));
    const unbindFx = bindClawFx(engine);
    const off = engine.events.on((e) => {
      if (e.type === "prizeDelivered") onPrizeDelivered(e.prizeId, e.points, e.rarity);
      else if (e.type === "lifted" && !e.caught) onMiss();
      else if (e.type === "slip") onMiss();
      else if (e.type === "levelClear") onLevelClear();
    });
    return () => {
      engine.onHud(null);
      unbindFx();
      off();
      useClawHud.getState().clear();
      useJuice.getState().clear();
    };
  }, [engine]);

  // Keyboard while playing, plus auto-pause when the tab or window loses focus.
  useEffect(() => {
    if (ui !== "playing") return;
    const unbind = bindKeyboard(window, (action) => {
      if (action.kind === "move") engine.move(action.dir, action.pressed);
      else if (action.kind === "grab") engine.grab();
      else engine.togglePause();
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
  }, [ui, engine]);

  const play = () => {
    fx.unlock();
    useJuice.getState().clear();
    setCelebration(null);
    setClear(null);
    roundIdRef.current = `claw-${Date.now()}`;
    setSave("saving");
    attemptRef.current = startAttempt(nickname, mysteryWorld ? { character, color, level: setup.level, mystery: mysteryWorld } : { character, color, level: setup.level })
      .then((r) => {
        setSave("saved");
        return r;
      })
      .catch(() => {
        setSave("unsaved");
        return null;
      });
    engine.start();
    setUi("playing");
  };

  const keepPlaying = useCallback(() => {
    setCelebration(null);
    engine.continue();
    if (engine.phase !== "levelClear") setUi("playing");
  }, [engine]);

  /** Closes an open attempt when the player leaves a level early. Prizes already won stay won. */
  const closeOpenAttempt = useCallback(() => {
    if (ui === "menu" || ui === "levelClear" || engine.grabs === 0) return;
    void sendComplete(engine.summary());
  }, [ui, engine, sendComplete]);

  const replay = () => {
    closeOpenAttempt();
    engine.reset(setup);
    play();
  };
  const nextLevel = () => {
    if (level < MAX_LEVEL) setLevel(level + 1);
    setUi("menu");
  };
  const quit = () => {
    closeOpenAttempt();
    router.push("/claw");
  };
  const toMystery = (w: WorldId) => router.push(`/play/claw?mystery=${w}`);

  const playing = ui === "playing";
  const paused = playing && hud.phase === "paused";
  const insets = useMemo(() => ({ top: compact ? 0.15 : 0.1, bottom: compact ? 0.24 : 0.14 }), [compact]);
  const prize = celebration ? PRIZE_BY_ID[celebration.prizeId] : null;
  const showSave = ui !== "menu" && (save !== "saved" || pending > 0 || profileOffline);

  return (
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: N.bg, display: "flex", flexDirection: "column", userSelect: "none" }}>
      <Box sx={{ position: "absolute", inset: 0 }}>
        <ClawCanvas engine={engine} palette={world.palette} insets={insets} />
      </Box>

      <Stack spacing={0.75} sx={{ position: "relative", p: 1.25, pt: "max(10px, env(safe-area-inset-top))", zIndex: 1, pointerEvents: "none", "& > * > *": { pointerEvents: "auto" } }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <QuitButton onQuit={quit} />
          {playing && (
            <IconButton aria-label="Pause" onClick={() => engine.togglePause()} sx={{ width: 46, height: 46 }}>
              <PauseRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <SettingsToggles size="small" />
          </Box>
          <Box sx={{ flex: 1 }} />
          <PointsPill />
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <LevelAndGoal worldName={world.name} accent={world.palette.glow} mystery={!!mysteryWorld} />
          {showSave && <SaveStatusChip status={save} pending={pending} compact={compact} />}
        </Stack>
        <Box sx={{ display: "flex", justifyContent: "center", minHeight: 42 }}>
          <HintBanner />
        </Box>
      </Stack>

      <Box sx={{ position: "relative", flex: 1, minHeight: 0, pointerEvents: "none" }}>
        <FlashOverlay />
        <ScorePopups />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, px: 1.5, pt: 1, pb: "max(14px, env(safe-area-inset-bottom))" }}>
        <ClawControls
          depthControl={hud.depthControl}
          canMove={playing && hud.canMove}
          canGrab={playing && hud.canGrab}
          showKeys={!touch}
          mystery={!!mysteryWorld}
          onMove={(dir, pressed) => engine.move(dir, pressed)}
          onGrab={() => engine.grab()}
        />
      </Box>

      {ui === "menu" && mysteryWorld && <MysteryMenu world={world} touch={touch} alreadyWon={profile.mysteryWorldsWon.includes(mysteryWorld)} onPlay={play} onClose={quit} />}
      {ui === "menu" && !mysteryWorld && (
        <MachineMenu
          level={level}
          world={world}
          goal={setup.goal}
          depthControl={setup.depthControl}
          touch={touch}
          maxLevel={profile.currentLevel}
          starsByLevel={starsByLevel}
          onPickLevel={setLevel}
          onPlay={play}
          onClose={quit}
        />
      )}
      {paused && <PauseOverlay onResume={() => engine.resume()} onRestart={replay} onQuit={quit} />}
      {ui === "celebrating" && celebration && prize && (
        <PrizeCelebration prize={prize} points={celebration.points} cheer={celebration.cheer} count={celebration.count} unlockedAvatars={celebration.newAvatars} onContinue={keepPlaying} />
      )}
      {ui === "levelClear" && clear && (
        <LevelClearCard
          summary={clear.summary}
          accent={world.palette.glow}
          hasNext={!mysteryWorld && level < MAX_LEVEL}
          mystery={!!mysteryWorld}
          unlockedAvatars={clear.newAvatars}
          mysteryUnlocked={clear.mysteryUnlocked !== null}
          saveState={save !== "saved" || pending > 0 ? <SaveStatusChip status={save} pending={pending} /> : undefined}
          onNext={nextLevel}
          onReplay={replay}
          onArcade={quit}
          onMystery={clear.mysteryUnlocked ? () => toMystery(clear.mysteryUnlocked!) : undefined}
        />
      )}
    </Box>
  );
}

export default function ClawGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
