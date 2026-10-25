"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import { useRoundMusic } from "@/components/MusicDirector";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { useSubmitScore } from "@/features/scores/hooks";
import { fx } from "@/lib/fx";
import MainMenu from "./components/MainMenu";
import { formatTime } from "./components/format";
import { LoadingScreen, PauseOverlay, ResultsCard } from "./components/Overlays";
import RacingCanvas from "./components/RacingCanvas";
import RacingHud from "./components/RacingHud";
import TouchControls from "./components/TouchControls";
import { R, bigText, plate } from "./components/hudStyle";
import { bindKeyboard, mergeControls } from "./engine/input";
import { RaceEngine } from "./engine/RaceEngine";
import { bindRacingFx } from "./fx";
import { FITZMAGIC, type CarLook } from "./render/vehicle/styles";
import { RIVALS, rivalLooks, type Rival } from "./rivals";
import { raceDurationSeconds, raceScore, raceStars } from "./score";
import { useRacingSettings, type RaceMode } from "./settings";
import { neutralControls, type Controls } from "./types";
import { useRacingHud } from "./useRacingHud";
import { loadWorld, trackById } from "./world";

const NO_RIVALS: readonly Rival[] = [];
const rivalsFor = (mode: RaceMode) => (mode === "rivals" ? RIVALS : NO_RIVALS);
/** Minimap arrow colours: the player, then each rival. */
const CAR_COLORS = [R.pink, ...RIVALS.map((r) => r.color)];
const RIVAL_LOOKS = rivalLooks(RIVALS);

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const helmet = usePlayerStore((s) => s.color);
  const skin = usePlayerStore((s) => s.skinColor);
  const finishRound = usePlayerStore((s) => s.finishRound);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const submit = useSubmitScore();
  const assist = useRacingSettings((s) => s.assist);
  const trackId = useRacingSettings((s) => s.trackId);
  const setTrackId = useRacingSettings((s) => s.setTrackId);
  const mode = useRacingSettings((s) => s.mode);
  const setMode = useRacingSettings((s) => s.setMode);
  // This component only renders after the persisted player has loaded, so the media query is safe to read at once.
  const touch = useMediaQuery("(hover: none), (pointer: coarse)", { noSsr: true });
  const portrait = useMediaQuery("(orientation: portrait)", { noSsr: true });

  // Picking another track in the menu builds that world and a fresh engine for it; the canvas reloads around them.
  const world = useMemo(() => loadWorld(trackById(trackId)), [trackId]);
  const engine = useMemo(() => {
    const { assist: a, mode: m } = useRacingSettings.getState();
    return new RaceEngine(world.track, world.content, { tier: world.track.def.tier, assist: a, rivals: rivalsFor(m) });
  }, [world]);
  // Every car the race could need: the player's, then the rivals in grid order (a time trial only draws the first).
  const cars = useMemo<CarLook[]>(() => [{ body: "fitzmagic", style: { ...FITZMAGIC, helmet, skin } }, ...RIVAL_LOOKS], [helmet, skin]);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [board, setBoard] = useState<{ score: number; rank?: number; personalBest?: boolean } | null>(null);
  const posted = useRef<string | null>(null);
  const phase = useRacingHud((s) => s.phase);
  const resultsReady = useRacingHud((s) => s.resultsReady);
  const racing = phase !== "ready";
  // Metal from the countdown until you quit back to the menu (the menu keeps the shop playlist).
  useRoundMusic(racing, "racing");

  // Engine -> HUD store and sound.
  useEffect(() => {
    engine.onHud((h) => useRacingHud.getState().set(h));
    const unbindFx = bindRacingFx(engine);
    return () => {
      engine.onHud(null);
      unbindFx();
      useRacingHud.getState().clear();
    };
  }, [engine]);

  // Keyboard and touch both feed one set of controls.
  const keys = useRef<Controls>(neutralControls());
  const pad = useRef<Controls>(neutralControls());
  const publish = useCallback(() => engine.setControls(mergeControls(keys.current, pad.current)), [engine]);
  const onPad = useCallback(
    (c: Controls) => {
      pad.current = c;
      publish();
    },
    [publish],
  );

  useEffect(() => {
    if (!racing) return;
    const unbind = bindKeyboard(window, {
      onControls: (c) => {
        keys.current = c;
        publish();
      },
      onPause: () => engine.togglePause(),
      onReset: () => engine.respawn(),
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
  }, [racing, engine, publish]);

  // A phone held upright pauses the race until it is turned sideways.
  const needsRotate = touch && portrait;
  useEffect(() => {
    if (needsRotate) engine.pause();
  }, [needsRotate, engine]);

  const play = () => {
    fx.unlock();
    setBoard(null);
    engine.configure(world.track.def.tier, assist, rivalsFor(mode));
    engine.reset();
    engine.start();
  };
  const toMenu = () => engine.reset();
  // The grid behind the menu fills up or empties straight away.
  const pickMode = (m: RaceMode) => {
    setMode(m);
    engine.configure(world.track.def.tier, assist, rivalsFor(m));
    engine.reset();
  };
  const pickTrack = (id: string) => {
    if (id === world.track.def.id) return;
    setReady(false);
    setFailed(false);
    setTrackId(id);
  };
  const quit = () => router.push("/adventure");

  const summary = useMemo(() => (resultsReady ? engine.summary() : null), [resultsReady, engine]);
  const hudVisible = racing && ready;

  useEffect(() => {
    if (!summary?.finished || !character) return;
    const roundId = `racing:${summary.trackId}:${summary.timeSeconds.toFixed(3)}:${summary.coins}:${summary.gems}`;
    if (posted.current === roundId) return;
    posted.current = roundId;
    const score = raceScore(summary);
    const durationSeconds = raceDurationSeconds(summary.timeSeconds);
    const level = Math.min(5, Math.max(1, summary.tier));
    setBoard({ score });
    finishRound({
      mode: "racing",
      score,
      durationSeconds,
      roundId,
      level,
      stars: raceStars(summary),
      metrics: { place: summary.place, coins: summary.coins, gems: summary.gems, laps: summary.laps },
      highlights: [{ label: "Time", value: formatTime(summary.timeSeconds) }, ...(summary.racers > 1 ? [{ label: "Place", value: String(summary.place) }] : [])],
    });
    submit.mutate(
      { nickname, character, color, mode: "racing", score, level, durationSeconds },
      { onSuccess: (data) => {
          markSubmitted(roundId, { rank: data.rank, personalBest: data.isPersonalBest });
          setBoard({ score, rank: data.rank, personalBest: data.isPersonalBest });
        },
      },
    );
    // posted ref is the one-shot guard; submit identity is not part of the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, character, nickname, color]);

  return (
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: "#8cc7f2", userSelect: "none", touchAction: "none" }}>
      <RacingCanvas engine={engine} cars={cars} lowPower={touch} onReady={() => setReady(true)} onFail={() => setFailed(true)} />

      {hudVisible && <RacingHud engine={engine} touch={touch} colors={CAR_COLORS} />}
      {hudVisible && touch && (phase === "racing" || phase === "countdown" || phase === "finished") && <TouchControls onChange={onPad} onReset={() => engine.respawn()} autoGas={assist === "extra"} />}

      {hudVisible && phase !== "paused" && !resultsReady && (
        <IconButton
          aria-label="Pause"
          onClick={() => engine.pause()}
          sx={{ ...plate, position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: touch ? "max(14px, env(safe-area-inset-right))" : "auto", left: touch ? "auto" : "50%", ml: touch ? 0 : "-23px", width: 46, height: 46, zIndex: 5 }}
        >
          <PauseRoundedIcon sx={{ color: R.goldLight }} />
        </IconButton>
      )}

      {ready && phase === "ready" && (
        <MainMenu
          track={world.track.def}
          nickname={nickname}
          vehicleName={FITZMAGIC.name}
          touch={touch}
          mode={mode}
          rivals={RIVALS}
          onPickMode={pickMode}
          onPickTrack={pickTrack}
          onPlay={play}
          onQuit={quit}
        />
      )}
      {ready && phase === "paused" && !needsRotate && <PauseOverlay touch={touch} onResume={() => engine.resume()} onRestart={play} onQuit={toMenu} />}
      {ready && resultsReady && summary && (
        <ResultsCard
          summary={summary}
          playerName={nickname}
          colors={CAR_COLORS}
          score={board?.score}
          rank={board?.rank}
          personalBest={board?.personalBest}
          onAgain={play}
          onMenu={toMenu}
          onRanks={() => router.push("/scoreboard?mode=racing")}
        />
      )}

      {needsRotate && ready && (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 40, display: "grid", placeItems: "center", bgcolor: "rgba(20,12,0,0.85)", textAlign: "center", p: 3 }}>
          <Box>
            <Typography sx={{ fontSize: 72, lineHeight: 1, display: "inline-block", animation: "racingTurn 1.6s ease-in-out infinite", "@keyframes racingTurn": { "0%,20%": { transform: "rotate(0deg)" }, "60%,100%": { transform: "rotate(-90deg)" } } }} aria-hidden>
              📱
            </Typography>
            <Typography sx={{ ...bigText, fontSize: "1.8rem", mt: 1 }}>Turn your device sideways</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>The Fitz and Furious plays best in landscape.</Typography>
          </Box>
        </Box>
      )}

      {(!ready || failed) && <LoadingScreen failed={failed} />}
    </Box>
  );
}

export default function RacingGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
