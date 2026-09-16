"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import PlayerAvatar from "@/components/PlayerAvatar";
import RequirePlayer from "@/components/RequirePlayer";
import { SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import TileButton from "@/components/ui/TileButton";
import { C, floatShadow, hardShadow } from "@/design/tokens";
import { usePlayerStore } from "@/features/player/store";
import { usePersonalBests } from "@/features/scores/hooks";
import { ACHIEVEMENTS } from "@/features/player/achievements";
import { LEVEL_NAMES, STARS_PER_LEVEL, dailyStreak, levelForStars } from "@/features/player/progress";
import { MODE_LABELS, type GameMode } from "@/features/player/types";
import { music } from "@/lib/fx";
import { dailyKey } from "@/lib/rng";

const ADVENTURES: {
  mode: GameMode;
  title: string;
  blurb: string;
  emoji: string;
  fill: string;
  edge: string;
}[] = [
  {
    mode: "kitchen",
    title: "Make pizzas",
    blurb: "Top it, bake it, serve it",
    emoji: "🍕",
    fill: C.tomato,
    edge: C.tomatoDeep,
  },
  {
    mode: "delivery",
    title: "Deliver pizzas",
    blurb: "Ride fast, dodge cones",
    emoji: "🛵",
    fill: C.blue,
    edge: C.blueDeep,
  },
];

/** Star pips showing progress inside the current level. */
function StarPips({ stars }: { stars: number }) {
  const inLevel = levelForStars(stars) >= 5 ? STARS_PER_LEVEL : stars % STARS_PER_LEVEL;
  return (
    <Stack direction="row" spacing={0.25} aria-label={`${inLevel} of ${STARS_PER_LEVEL} stars to the next level`}>
      {Array.from({ length: STARS_PER_LEVEL }).map((_, i) => (
        <StarRoundedIcon
          key={i}
          sx={{
            fontSize: 20,
            color: i < inLevel ? C.sun : "rgba(22,33,46,0.22)",
            filter: i < inLevel ? "drop-shadow(0 2px 0 rgba(22,33,46,0.25))" : undefined,
          }}
        />
      ))}
    </Stack>
  );
}

/** Small white stat pill used inside the coloured adventure cards. */
function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        height: 28,
        borderRadius: 999,
        bgcolor: C.white,
        color: C.ink,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "0.85rem",
        boxShadow: "0 2px 0 rgba(22,33,46,0.18)",
      }}
    >
      {children}
    </Box>
  );
}

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const stars = usePlayerStore((s) => s.stars);
  const history = usePlayerStore((s) => s.history);
  const achievements = usePlayerStore((s) => s.achievements);
  const bests = usePersonalBests(nickname);
  const bestFor = (mode: GameMode) => bests.data?.find((b) => b.mode === mode)?.score;

  const today = dailyKey();
  const dailyDone = (mode: GameMode) => history.some((h) => h.challengeDate === today && h.mode === mode);
  const streak = dailyStreak(
    history.map((h) => h.challengeDate),
    today,
  );
  const trophyCount = Object.keys(achievements).length;
  const totalStars = (stars.kitchen ?? 0) + (stars.delivery ?? 0);

  // Mellow hub music (only audible once the player has tapped something, per browser rules).
  useEffect(() => {
    music.play("menu");
    music.intensity(0);
    return () => music.stop(0.6);
  }, []);

  return (
    <PageContainer>
      <Stack spacing={2} sx={{ flex: 1, py: 1.5 }}>
        {/* Player bar: name badge on the left, stars + settings on the right. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            onClick={() => router.push("/character")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && router.push("/character")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              pl: 0.5,
              pr: 1.75,
              height: 46,
              borderRadius: 999,
              bgcolor: C.white,
              boxShadow: floatShadow,
              cursor: "pointer",
              "&:active": { transform: "translateY(2px)" },
            }}
          >
            <PlayerAvatar nickname={nickname} character={character} color={color} size={38} />
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem" }}>
              {nickname}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.25,
              height: 46,
              borderRadius: 999,
              bgcolor: C.white,
              boxShadow: floatShadow,
            }}
          >
            <StarRoundedIcon sx={{ color: C.sun, fontSize: 26 }} />
            <Typography className="tnum" sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem" }}>
              {totalStars}
            </Typography>
          </Box>
          <SettingsToggles size="small" />
        </Stack>

        <Typography
          variant="h2"
          component="h1"
          sx={{
            textAlign: "center",
            color: C.white,
            WebkitTextStroke: `8px ${C.blueDeep}`,
            paintOrder: "stroke fill",
            filter: "drop-shadow(0 4px 0 rgba(22,33,46,0.16))",
          }}
        >
          Pick your shift!
        </Typography>

        {/* The two game modes as fat plastic cards. */}
        <Stack spacing={1.75} sx={{ flex: 1, justifyContent: "center" }}>
          {ADVENTURES.map(({ mode, title, blurb, emoji, fill, edge }) => {
            const modeStars = stars[mode] ?? 0;
            const level = levelForStars(modeStars);
            const best = bestFor(mode);
            return (
              <Box
                key={mode}
                component="button"
                onClick={() => router.push(`/play/${mode}`)}
                aria-label={`Play ${MODE_LABELS[mode]}`}
                sx={{
                  appearance: "none",
                  border: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flex: 1,
                  minHeight: 140,
                  maxHeight: 210,
                  p: 2,
                  borderRadius: "28px",
                  bgcolor: fill,
                  color: C.white,
                  boxShadow: hardShadow(edge, 8),
                  transition: "transform 90ms ease, box-shadow 90ms ease",
                  "&:active": { transform: "translateY(5px)", boxShadow: `0 3px 0 ${edge}` },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 82,
                    height: 82,
                    flexShrink: 0,
                    borderRadius: "50%",
                    bgcolor: "rgba(255,255,255,0.22)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 46,
                    lineHeight: 1,
                    boxShadow: "inset 0 -4px 0 rgba(22,33,46,0.10)",
                  }}
                >
                  {emoji}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h3" component="h2" sx={{ lineHeight: 1.1 }}>
                    {title}
                  </Typography>
                  <Typography sx={{ opacity: 0.95, fontSize: "0.95rem", mb: 1 }}>{blurb}</Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                    <StatPill>
                      Lv {level} · {LEVEL_NAMES[level]}
                    </StatPill>
                    {best !== undefined && (
                      <StatPill>
                        <EmojiEventsRoundedIcon sx={{ fontSize: 16, color: C.sunDeep }} /> {best}
                      </StatPill>
                    )}
                    <StarPips stars={modeStars} />
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Stack>

        {/* Daily challenge */}
        <Panel accent={C.sun} padding={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <Typography variant="h4" component="h2" sx={{ flex: 1 }}>
              📅 Today&apos;s challenge
            </Typography>
            {streak > 0 && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  px: 1,
                  height: 30,
                  borderRadius: 999,
                  bgcolor: C.tomato,
                  color: C.white,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  boxShadow: `0 3px 0 ${C.tomatoDeep}`,
                }}
              >
                <LocalFireDepartmentRoundedIcon sx={{ fontSize: 18, color: C.sun }} />
                {streak}
              </Box>
            )}
          </Stack>
          <Typography sx={{ color: C.inkSoft, fontSize: "0.95rem", mb: 1.5 }}>
            Everyone gets the same orders and the same street. One shot a day!
          </Typography>
          <Stack direction="row" spacing={1}>
            {ADVENTURES.map(({ mode, emoji, fill, edge }) => {
              const done = dailyDone(mode);
              return (
                <TileButton
                  key={mode}
                  tone="white"
                  onClick={() => router.push(`/play/${mode}?daily=1`)}
                  ariaLabel={`Play today's ${MODE_LABELS[mode]} challenge`}
                  sx={{ flex: 1, flexDirection: "row", gap: 0.75, py: 1.25 }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: done ? C.money : fill,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 16,
                      boxShadow: `0 2px 0 ${done ? C.moneyDeep : edge}`,
                    }}
                  >
                    {done ? <CheckRoundedIcon sx={{ fontSize: 18, color: C.white }} /> : emoji}
                  </Box>
                  {MODE_LABELS[mode].split(" ")[1]}
                </TileButton>
              );
            })}
          </Stack>
        </Panel>

        <Stack direction="row" spacing={1}>
          <Button fullWidth size="small" variant="outlined" color="primary" onClick={() => router.push("/scoreboard")}>
            Ranks
          </Button>
          <Button fullWidth size="small" variant="outlined" color="primary" onClick={() => router.push("/my-scores")}>
            My runs
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => router.push("/trophies")}
            startIcon={<EmojiEventsRoundedIcon />}
          >
            {trophyCount}/{ACHIEVEMENTS.length}
          </Button>
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function AdventureHub() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
