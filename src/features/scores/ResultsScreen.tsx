"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import Panel from "@/components/ui/Panel";
import { N, neonGlow, textGlow } from "@/design/neon";
import { ACHIEVEMENT_BY_ID } from "@/features/player/achievements";
import { usePlayerStore, useStars } from "@/features/player/store";
import { LEVEL_NAMES, levelForStars, starsToNextLevel } from "@/features/player/progress";
import { BIKE_SKINS, DIRECT_SUBMIT_MODES, MODE_LABELS } from "@/features/player/types";
import { celebrate, fx } from "@/lib/fx";
import { useSubmitScore } from "./hooks";
import { shareResult } from "./shareCard";

/** Three fat stars that pop in one after another. */
function StarRow({ stars }: { stars: number }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center" }} aria-label={`${stars} of 3 stars`}>
      {[0, 1, 2].map((i) => {
        const on = i < stars;
        return (
          <Box
            key={i}
            sx={{
              width: 62,
              height: 62,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: on ? N.sun : N.panelEdge,
              boxShadow: on ? neonGlow(N.sun, 12) : "0 4px 14px rgba(0,0,0,0.4)",
              // The middle star sits a little higher, like a podium.
              mt: i === 1 ? -1.5 : 0,
              animation: on ? `starIn 520ms ${180 + i * 200}ms cubic-bezier(.2,1.7,.4,1) both` : undefined,
              "@keyframes starIn": {
                from: { transform: "scale(0) rotate(-40deg)", opacity: 0 },
                to: { transform: "scale(1) rotate(0)", opacity: 1 },
              },
            }}
          >
            <StarRoundedIcon sx={{ fontSize: 40, color: on ? N.bg : "rgba(147,165,190,0.35)" }} />
          </Box>
        );
      })}
    </Stack>
  );
}

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character);
  const color = usePlayerStore((s) => s.color);
  const result = usePlayerStore((s) => s.lastResult);
  const lastUnlocked = usePlayerStore((s) => s.lastUnlocked);
  const submittedRounds = usePlayerStore((s) => s.submittedRounds);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const stars = useStars(result?.mode ?? "kitchen");
  const submit = useSubmitScore();
  const attempted = useRef<string | null>(null);
  const celebrated = useRef<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    if (!result) {
      router.replace("/adventure");
      return;
    }
    if (!character) return;
    if (submittedRounds.includes(result.roundId)) return;
    if (attempted.current === result.roundId) return;
    // Frogger and claw scores are written by their own attempt APIs.
    if (!DIRECT_SUBMIT_MODES.includes(result.mode)) return;
    attempted.current = result.roundId;
    submit.mutate(
      {
        nickname,
        character,
        color,
        mode: result.mode,
        score: result.score,
        level: result.level,
        durationSeconds: result.durationSeconds,
        challengeDate: result.challengeDate,
      },
      { onSuccess: (data) => markSubmitted(result.roundId, { rank: data.rank, personalBest: data.isPersonalBest }) },
    );
    // submit is stable enough for our purposes; we guard with attempted ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, character, nickname, color]);

  // Level progression: this round's stars were already added to `stars`.
  const levelNow = levelForStars(stars);
  const levelBefore = result ? levelForStars(stars - (result.challengeDate ? 0 : result.stars)) : levelNow;
  const leveledUp = !!result && !result.challengeDate && levelNow > levelBefore;
  const toNext = starsToNextLevel(stars);

  // Fanfare + confetti once per round; a bigger burst for a new personal best.
  useEffect(() => {
    if (!result) return;
    if (celebrated.current === result.roundId) return;
    celebrated.current = result.roundId;
    fx.fanfare();
    void celebrate(result.stars >= 3);
    if (leveledUp) setTimeout(() => fx.levelup(), 1300);
    if (lastUnlocked.length) setTimeout(() => fx.unlocked(), leveledUp ? 2300 : 1300);
  }, [result, leveledUp, lastUnlocked]);
  useEffect(() => {
    if (submit.isSuccess && submit.data.isPersonalBest) {
      fx.best();
      void celebrate(true);
    }
  }, [submit.isSuccess, submit.data]);

  if (!result) return null;
  const alreadySaved = submittedRounds.includes(result.roundId);
  const unlockedSkins = BIKE_SKINS.filter((s) => s.unlockedBy && lastUnlocked.includes(s.unlockedBy));
  const headline =
    result.stars >= 3 ? "Perfetto!" : result.stars >= 2 ? "Great job!" : result.stars >= 1 ? "Nice work!" : "Good try!";
  const accent = result.stars >= 2 ? N.brand : result.stars >= 1 ? N.delivery : N.sun;

  const onShare = async () => {
    if (!character) return;
    setShareState("busy");
    try {
      await shareResult({
        nickname,
        character,
        color,
        mode: result.mode,
        score: result.score,
        stars: result.stars,
        level: result.level,
        rank: submit.data?.rank,
        personalBest: submit.data?.isPersonalBest,
        challengeDate: result.challengeDate,
      });
      setShareState("done");
    } catch {
      setShareState("idle");
    }
  };

  return (
    <PageContainer>
      <Stack spacing={2} sx={{ flex: 1, py: 2, justifyContent: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              color: accent,
              textShadow: textGlow(accent),
            }}
          >
            {headline}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap", mt: 0.5 }}>
            <Chip label={MODE_LABELS[result.mode]} sx={{ bgcolor: N.bgRaise, color: N.text, border: `1px solid ${N.panelEdge}` }} />
            {result.challengeDate && <Chip label="📅 Daily" sx={{ bgcolor: N.sun, color: N.bg }} />}
          </Stack>
        </Box>

        <Panel accent={accent} padding={3}>
          <StarRow stars={result.stars} />
          <Typography sx={{ color: N.textSoft, fontWeight: 800, mt: 1.5, textAlign: "center" }}>Your score</Typography>
          <Typography
            className="tnum"
            sx={{
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontSize: "5.2rem",
              fontWeight: 800,
              lineHeight: 1,
              // Glowing numerals: the neon take on the old extruded look.
              color: N.kitchen,
              textShadow: textGlow(N.kitchen),
              my: 1,
              animation: "bounceIn 600ms cubic-bezier(.2,1.5,.4,1)",
              "@keyframes bounceIn": { from: { transform: "scale(0.4)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
            }}
          >
            {result.score}
          </Typography>

          <Box sx={{ minHeight: 40, display: "grid", placeItems: "center" }}>
            {submit.isPending && <CircularProgress size={26} />}
            {submit.isSuccess && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
                <Chip
                  icon={<EmojiEventsRoundedIcon />}
                  label={result.challengeDate ? `#${submit.data.rank} today` : `#${submit.data.rank} all time`}
                  sx={{ bgcolor: N.delivery, color: N.bg, "& .MuiChip-icon": { color: N.sun } }}
                />
                {submit.data.isPersonalBest && (
                  <Chip label="⭐ New best!" sx={{ bgcolor: N.brand, color: N.bg }} />
                )}
              </Stack>
            )}
            {!submit.isPending && !submit.isSuccess && alreadySaved && <Chip label="Score saved" variant="outlined" />}
            {submit.isError && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" onClick={() => submit.reset()}>
                    Retry
                  </Button>
                }
              >
                Couldn&apos;t save your score right now.
              </Alert>
            )}
          </Box>
        </Panel>

        {leveledUp ? (
          <Alert icon={<TrendingUpRoundedIcon />} severity="success" sx={{ bgcolor: N.brand, color: N.bg, "& .MuiAlert-icon": { color: N.bg } }}>
            Level up! You are now a level {levelNow} {LEVEL_NAMES[levelNow]}.
          </Alert>
        ) : (
          !result.challengeDate &&
          toNext !== null && (
            <Typography sx={{ textAlign: "center", color: N.text, fontWeight: 700 }}>
              Level {levelNow} {LEVEL_NAMES[levelNow]} · {toNext} more {toNext === 1 ? "star" : "stars"} to level {levelNow + 1}
            </Typography>
          )
        )}

        {lastUnlocked.length > 0 && (
          <Panel accent={N.sun} padding={2}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              🏅 New {lastUnlocked.length === 1 ? "trophy" : "trophies"}!
            </Typography>
            <Stack spacing={1}>
              {lastUnlocked.map((id, i) => {
                const a = ACHIEVEMENT_BY_ID[id];
                if (!a) return null;
                return (
                  <Stack
                    key={id}
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      animation: `slideIn 400ms ${300 + i * 150}ms cubic-bezier(.2,1.2,.4,1) both`,
                      "@keyframes slideIn": { from: { transform: "translateX(-16px)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
                    }}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        borderRadius: "50%",
                        bgcolor: N.bgRaise,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 26,
                        border: `1px solid ${N.sun}59`,
                      }}
                    >
                      {a.emoji}
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>{a.title}</Typography>
                      <Typography variant="body2" sx={{ color: N.textSoft }}>
                        {a.description}
                      </Typography>
                    </Box>
                  </Stack>
                );
              })}
              {unlockedSkins.map((s) => (
                <Chip
                  key={s.id}
                  label={`New bike: ${s.label}`}
                  sx={{ bgcolor: s.frame, color: "#fff", alignSelf: "flex-start" }}
                  onClick={() => router.push("/character")}
                />
              ))}
            </Stack>
          </Panel>
        )}

        <Stack direction="row" spacing={0.75} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
          {result.highlights.map((h) => (
            <Chip key={h.label} label={`${h.label}: ${h.value}`} variant="outlined" />
          ))}
        </Stack>

        <Stack spacing={1}>
          <Button
            size="large"
            variant="contained"
            color="success"
            startIcon={<ReplayRoundedIcon />}
            onClick={() => router.push(result.challengeDate ? `/play/${result.mode}?daily=1` : `/play/${result.mode}`)}
          >
            Play again
          </Button>
          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="outlined" color="primary" onClick={() => router.push("/adventure")}>
              Back to shop
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              startIcon={<IosShareRoundedIcon />}
              disabled={shareState === "busy"}
              onClick={onShare}
            >
              {shareState === "done" ? "Shared!" : "Share"}
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
            <Button variant="text" startIcon={<EmojiEventsRoundedIcon />} onClick={() => router.push("/scoreboard")}>
              Ranks
            </Button>
            <Button variant="text" onClick={() => router.push("/my-scores")}>
              My runs
            </Button>
            <Button variant="text" onClick={() => router.push("/trophies")}>
              Trophies
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function ResultsScreen() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
