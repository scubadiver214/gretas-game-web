"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePendingRouter } from "@/components/PendingNavigation";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useRoundMusic } from "@/components/MusicDirector";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { useSubmitScore } from "@/features/scores/hooks";
import { useSettingsStore } from "@/features/settings/store";
import { fx } from "@/lib/fx";
import { huntSfx, LakeAmbience } from "./audio";
import HuntHud from "./components/HuntHud";
import { Journal, LevelIntro, LevelSelect, MainMenu, SettingsPanel } from "./components/Menus";
import { ExploreSummary, LoadingScreen, PauseOverlay, ResultsCard, RotatePrompt } from "./components/Overlays";
import TouchControls from "./components/TouchControls";
import { AIM } from "./config";
import { adaptiveBoost, difficultyById } from "./engine/difficulty";
import { HuntEngine } from "./engine/HuntEngine";
import { bindHuntFx } from "./fx";
import { EXPLORE_LEVEL, LEVELS, nextLevel, type LevelDef } from "./levels";
import { useHuntProgress } from "./progress";
import { CanvasBridge } from "./render/bridge";
import HuntCanvas from "./render/HuntCanvas";
import type { HuntSummary, SpeciesId } from "./types";
import { useHuntHud } from "./useHuntHud";

type View = "menu" | "levels" | "intro" | "journal" | "settings" | "game";

function optionsFor(level: LevelDef) {
  const p = useHuntProgress.getState();
  return { level, difficulty: difficultyById(p.difficulty), boost: level.activity === "explore" ? undefined : adaptiveBoost(p.levels[level.id]), assist: p.assist };
}

function Inner() {
  const { push } = usePendingRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const skin = usePlayerStore((s) => s.skinColor);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const submit = useSubmitScore();
  const touch = useMediaQuery("(hover: none), (pointer: coarse)", { noSsr: true });
  const portrait = useMediaQuery("(orientation: portrait)", { noSsr: true });
  const reducedMotion = useCallback(() => useSettingsStore.getState().reducedMotion, []);

  const engine = useMemo(() => new HuntEngine(optionsFor(LEVELS[0])), []);
  const [level, setLevel] = useState<LevelDef>(LEVELS[0]);
  const [view, setView] = useState<View>("menu");
  const [settingsFrom, setSettingsFrom] = useState<View | "pause">("menu");
  const [journalFrom, setJournalFrom] = useState<View>("menu");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<{ summary: HuntSummary; badges: string[]; rank?: number; personalBest?: boolean } | null>(null);
  const [found, setFound] = useState<SpeciesId[]>([]);
  const bridge = useMemo(() => new CanvasBridge(), []);
  const container = useRef<HTMLDivElement>(null);
  const ambience = useMemo(() => new LakeAmbience(), []);
  const posted = useRef<string | null>(null);
  const lockFailed = useRef(false);
  const phase = useHuntHud((s) => s.hud?.phase ?? "ready");
  const hud = useHuntHud((s) => s.hud);
  const inGame = view === "game";

  // Lakeside underscore on the music bus. The arcade playlist stays parked.
  useRoundMusic(true, "hunting");

  useEffect(() => {
    engine.onHud((h) => useHuntHud.getState().set(h));
    const unbind = bindHuntFx(engine, (p) => bridge.project(p));
    return () => {
      engine.onHud(null);
      unbind();
      useHuntHud.getState().clear();
    };
  }, [engine, bridge]);

  useEffect(() => () => ambience.stop(), [ambience]);
  useEffect(() => {
    ambience.setLevel(!inGame ? 0.28 : phase === "paused" ? 0.16 : 0.4);
  }, [ambience, inGame, phase]);

  // Photos: grab the frame (without the hands), file it in the journal, show the print.
  useEffect(
    () =>
      engine.events.on((e) => {
        if (e.type !== "photo") return;
        bridge.requestCapture((thumb) => {
          const { isNew, earned } = useHuntProgress.getState().recordPhoto(e.result, e.result.species ? thumb : null);
          useHuntHud.getState().showPhoto({ result: e.result, thumb, isNew });
          if (isNew && e.result.species) {
            huntSfx.discovery();
            const species = e.result.species;
            setFound((f) => (f.includes(species) ? f : [...f, species]));
          }
          if (earned.length) {
            fx.unlocked();
            useHuntHud.getState().toastBadges(earned);
          }
        });
      }),
    [engine, bridge],
  );

  const lock = useCallback(() => {
    if (touch || lockFailed.current) return;
    const el = container.current;
    if (!el || document.pointerLockElement === el) return;
    try {
      const r = el.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (r && typeof r.catch === "function") r.catch(() => (lockFailed.current = true));
    } catch {
      lockFailed.current = true;
    }
  }, [touch]);

  const unlock = () => {
    if (document.pointerLockElement) document.exitPointerLock?.();
  };

  const wake = () => {
    fx.unlock();
    ambience.start();
  };

  const configure = (l: LevelDef) => {
    setLevel(l);
    engine.configure(optionsFor(l));
  };

  const begin = () => {
    wake();
    setResult(null);
    setFound([]);
    posted.current = null;
    engine.configure(optionsFor(level));
    engine.start();
    setView("game");
    lock();
  };

  const toMenu = () => {
    unlock();
    engine.reset();
    setResult(null);
    setView("menu");
  };

  const pickLevel = (l: LevelDef) => {
    wake();
    configure(l);
    setView("intro");
  };

  const explore = () => {
    wake();
    configure(EXPLORE_LEVEL);
    setView("intro");
  };

  // Finished round: progress, badges, trophies, leaderboard.
  useEffect(() => {
    if (phase !== "done" || !inGame) return;
    const summary = engine.summary();
    if (!summary) return;
    const roundId = `hunting:${summary.levelId}:${engine.clock.toFixed(3)}:${summary.score}`;
    if (posted.current === roundId) return;
    posted.current = roundId;
    unlock();
    const badges = useHuntProgress.getState().recordRound(summary);
    if (badges.length) useHuntHud.getState().toastBadges(badges);
    setResult({ summary, badges });
    if (summary.activity === "explore" || !character) return;
    const durationSeconds = Math.max(1, Math.min(600, Math.round(summary.timeSeconds)));
    finishRound({
      mode: "hunting",
      score: summary.score,
      durationSeconds,
      roundId,
      level: summary.levelNumber,
      stars: summary.stars,
      metrics: { hits: summary.hits, accuracy: Math.round(summary.accuracy * 100), bestStreak: summary.bestStreak, doubles: summary.doubles, photos: summary.photos },
      highlights: [
        { label: "Ducks", value: `${summary.hits}/${summary.ducks}` },
        { label: "Accuracy", value: `${Math.round(summary.accuracy * 100)}%` },
      ],
    });
    if (summary.score <= 0) return;
    submit.mutate(
      { nickname, character, color, mode: "hunting", score: summary.score, level: summary.levelNumber, durationSeconds },
      {
        onSuccess: (data) => {
          markSubmitted(roundId, { rank: data.rank, personalBest: data.isPersonalBest });
          setResult((r) => (r && r.summary === summary ? { ...r, rank: data.rank, personalBest: data.isPersonalBest } : r));
        },
      },
    );
    // posted ref is the one-shot guard; submit identity is not part of the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inGame]);

  // Pointer lock, mouse, wheel and keyboard while a level is running.
  useEffect(() => {
    if (!inGame) return;
    const el = container.current;
    const onLockChange = () => {
      if (!touch && document.pointerLockElement !== el && engine.phase === "playing") engine.pause();
    };
    const onLockError = () => {
      lockFailed.current = true;
    };
    const onMove = (e: MouseEvent) => {
      if (touch) return;
      const locked = document.pointerLockElement === el;
      if (!locked && !lockFailed.current) return;
      const p = useHuntProgress.getState();
      const k = AIM.mouse * p.sensitivity;
      engine.look(-e.movementX * k, -e.movementY * k * (p.invertY ? -1 : 1));
    };
    const held = new Set<string>();
    const updateStick = () => {
      const x = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
      const y = (held.has("up") ? 1 : 0) - (held.has("down") ? 1 : 0);
      engine.setStick(x, y * (useHuntProgress.getState().invertY ? -1 : 1));
    };
    const dirFor = (code: string) => ({ ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" })[code];
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = dirFor(e.code);
      if (dir) {
        held.add(dir);
        updateStick();
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          engine.fire();
          break;
        case "KeyR":
          engine.reload();
          break;
        case "KeyQ":
        case "Tab":
          e.preventDefault();
          engine.swapTool();
          break;
        case "Digit1":
          engine.swapTool("shotgun");
          break;
        case "Digit2":
          engine.swapTool("camera");
          break;
        case "KeyZ":
        case "KeyE":
          engine.cycleZoom();
          break;
        case "KeyP":
        case "Escape":
          if (engine.phase === "paused") {
            engine.resume();
            lock();
          } else engine.pause();
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = dirFor(e.code);
      if (dir) {
        held.delete(dir);
        updateStick();
      }
    };
    const onHide = () => {
      if (document.hidden) engine.pause();
    };
    const onBlur = () => engine.pause();
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    document.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      engine.setStick(0, 0);
    };
  }, [inGame, engine, touch, lock]);

  // Clicks and touch-drag on the play area.
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (!inGame || engine.phase === "paused" || engine.phase === "done") return;
    // Touch only looks. Mouse buttons go through mousedown below: pointerdown fires
    // for the first button only, so a shot while aiming (right button held) was lost.
    if (e.pointerType !== "touch") return;
    if (!lookPointer.current) lookPointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (!inGame || touch || engine.phase === "paused" || engine.phase === "done") return;
    if (!lockFailed.current && document.pointerLockElement !== container.current) {
      lock();
      return;
    }
    if (e.button === 0) engine.fire();
    else if (e.button === 2) {
      e.preventDefault();
      if (engine.tool === "camera") engine.cycleZoom();
      else engine.setAds(true);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const lp = lookPointer.current;
    if (!lp || lp.id !== e.pointerId) return;
    const p = useHuntProgress.getState();
    const k = AIM.touch * p.sensitivity;
    engine.look(-(e.clientX - lp.x) * k, -(e.clientY - lp.y) * k * (p.invertY ? -1 : 1));
    lp.x = e.clientX;
    lp.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (lookPointer.current?.id === e.pointerId) lookPointer.current = null;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) engine.setAds(false);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!inGame || engine.tool !== "camera") return;
    engine.setZoom(engine.zoomIndex + (e.deltaY < 0 ? 1 : -1));
  };

  const needsRotate = touch && portrait;
  useEffect(() => {
    if (needsRotate) engine.pause();
  }, [needsRotate, engine]);

  const preset = difficultyById(useHuntProgress((s) => s.difficulty));
  const levelRecord = useHuntProgress((s) => s.levels[level.id]);
  const nextHelp = levelRecord && levelRecord.fails >= 1 ? adaptiveBoost({ ...levelRecord, fails: levelRecord.fails + 1 }).note : null;
  const journalCount = Object.keys(useHuntProgress((s) => s.journal)).length;
  const after = nextLevel(level.id);

  return (
    <Box
      ref={container}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: "#8cc7f2", userSelect: "none", touchAction: "none", cursor: inGame && phase === "playing" ? "none" : "default" }}
    >
      <HuntCanvas engine={engine} lowPower={touch} skin={skin} sleeve={color} reducedMotion={reducedMotion} bridge={bridge} onReady={() => setReady(true)} onFail={() => setFailed(true)} />

      {ready && inGame && <HuntHud touch={touch} onPause={() => engine.pause()} />}
      {ready && inGame && touch && hud && (hud.phase === "playing" || hud.phase === "countdown") && (
        <TouchControls hud={hud} onFire={() => engine.fire()} onAds={(on) => engine.setAds(on)} onReload={() => engine.reload()} onZoom={() => engine.cycleZoom()} onSwap={() => engine.swapTool()} />
      )}

      {ready && view === "menu" && (
        <MainMenu
          nickname={nickname}
          onPlay={() => {
            wake();
            setView("levels");
          }}
          onExplore={explore}
          onJournal={() => {
            setJournalFrom("menu");
            setView("journal");
          }}
          onSettings={() => {
            setSettingsFrom("menu");
            setView("settings");
          }}
          onQuit={() => push("/adventure")}
        />
      )}
      {ready && view === "levels" && <LevelSelect onPick={pickLevel} onBack={() => setView("menu")} />}
      {ready && view === "intro" && (
        <LevelIntro level={level} preset={preset} boost={engine.boost} touch={touch} onStart={begin} onBack={() => setView(level.activity === "explore" ? "menu" : "levels")} />
      )}
      {ready && view === "journal" && <Journal onBack={() => setView(journalFrom)} />}
      {ready && view === "settings" && (
        <SettingsPanel
          onBack={() => {
            engine.setAssist(useHuntProgress.getState().assist);
            if (settingsFrom === "pause") setView("game");
            else setView(settingsFrom);
          }}
        />
      )}

      {ready && inGame && phase === "paused" && !needsRotate && (
        <PauseOverlay
          explore={level.activity === "explore"}
          touch={touch}
          onResume={() => {
            engine.resume();
            lock();
          }}
          onRestart={begin}
          onSettings={() => {
            setSettingsFrom("pause");
            setView("settings");
          }}
          onFinishExplore={() => engine.finishExplore()}
          onMenu={toMenu}
        />
      )}

      {ready && inGame && phase === "done" && result && result.summary.activity === "ducks" && (
        <ResultsCard
          summary={result.summary}
          level={level}
          badges={result.badges}
          rank={result.rank}
          personalBest={result.personalBest}
          hasNext={!!after}
          helpNext={nextHelp}
          onNext={() => {
            if (!after) return;
            configure(after);
            setResult(null);
            setView("intro");
          }}
          onReplay={begin}
          onMenu={toMenu}
        />
      )}
      {ready && inGame && phase === "done" && result && result.summary.activity === "explore" && (
        <ExploreSummary
          summary={result.summary}
          discovered={found}
          badges={result.badges}
          journalCount={journalCount}
          onKeepExploring={begin}
          onJournal={() => {
            engine.reset();
            setJournalFrom("menu");
            setView("journal");
          }}
          onMenu={toMenu}
        />
      )}

      {needsRotate && ready && <RotatePrompt />}
      {(!ready || failed) && <LoadingScreen failed={failed} onBack={() => push("/adventure")} />}
    </Box>
  );
}

export default function HuntingGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
