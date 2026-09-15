"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LocalPizzaRoundedIcon from "@mui/icons-material/LocalPizzaRounded";
import PedalBikeRoundedIcon from "@mui/icons-material/PedalBikeRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PageContainer from "@/components/PageContainer";
import PlayerAvatar from "@/components/PlayerAvatar";
import RequirePlayer from "@/components/RequirePlayer";
import { SettingsToggles } from "@/components/HUD";
import { usePlayerStore } from "@/features/player/store";
import { usePersonalBests } from "@/features/scores/hooks";
import { LEVEL_NAMES, levelForRounds } from "@/features/player/progress";
import { CHARACTER_LABELS, MODE_LABELS, type GameMode } from "@/features/player/types";
import { dailyKey } from "@/lib/rng";

const ADVENTURES: {
  mode: GameMode;
  title: string;
  blurb: string;
  icon: typeof LocalPizzaRoundedIcon;
  gradient: string;
}[] = [
  {
    mode: "kitchen",
    title: "Make a pizza",
    blurb: "Read the order, add the toppings, and bake it just right.",
    icon: LocalPizzaRoundedIcon,
    gradient: "linear-gradient(135deg, #FFB347 0%, #F2542D 100%)",
  },
  {
    mode: "delivery",
    title: "Deliver pizzas",
    blurb: "Ride your bike through town and drop pizzas at the glowing mailboxes.",
    icon: PedalBikeRoundedIcon,
    gradient: "linear-gradient(135deg, #5EEAD4 0%, #0E9594 100%)",
  },
];

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const roundsPlayed = usePlayerStore((s) => s.roundsPlayed);
  const history = usePlayerStore((s) => s.history);
  const bests = usePersonalBests(nickname);
  const bestFor = (mode: GameMode) => bests.data?.find((b) => b.mode === mode)?.score;

  const today = dailyKey();
  const dailyDone = (mode: GameMode) => history.some((h) => h.challengeDate === today && h.mode === mode);
  const dailyTitle = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <PageContainer>
      <Stack spacing={2.5} sx={{ flex: 1, py: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <PlayerAvatar nickname={nickname} character={character} color={color} size={44} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.2 }}>
              {nickname} as {CHARACTER_LABELS[character]}
            </Typography>
            <Typography variant="h3" component="h1">
              What do you want to do today?
            </Typography>
          </Box>
          <SettingsToggles size="small" />
        </Stack>

        <Stack spacing={2} sx={{ flex: 1 }}>
          {ADVENTURES.map(({ mode, title, blurb, icon: Icon, gradient }) => {
            const level = levelForRounds(roundsPlayed[mode] ?? 0);
            return (
              <Card key={mode} sx={{ flex: 1, minHeight: 150, display: "flex" }}>
                <CardActionArea
                  onClick={() => router.push(`/play/${mode}`)}
                  sx={{ height: "100%", background: gradient, color: "#fff", p: 2.5 }}
                >
                  <Stack direction="row" spacing={2} sx={{ height: "100%", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 84,
                        height: 84,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.25)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon sx={{ fontSize: 52 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" component="h2">
                        {title}
                      </Typography>
                      <Typography sx={{ opacity: 0.95 }}>{blurb}</Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          label={`Level ${level} · ${LEVEL_NAMES[level]}`}
                          sx={{ bgcolor: "rgba(43,45,66,0.55)", color: "#fff", fontWeight: 800 }}
                        />
                        {bestFor(mode) !== undefined && (
                          <Chip
                            size="small"
                            icon={<EmojiEventsRoundedIcon />}
                            label={`Your best: ${bestFor(mode)}`}
                            sx={{ bgcolor: "rgba(255,255,255,0.9)", color: "#2B2D42" }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}

          <Card sx={{ display: "flex", background: "linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)", color: "#fff" }}>
            <Box sx={{ p: 2.5, width: "100%" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TodayRoundedIcon />
                <Typography variant="h3" component="h2" sx={{ flex: 1 }}>
                  Today&apos;s challenge
                </Typography>
                <Chip size="small" label={dailyTitle} sx={{ bgcolor: "rgba(255,255,255,0.9)", color: "#2B2D42", fontWeight: 800 }} />
              </Stack>
              <Typography sx={{ opacity: 0.95, mt: 0.5, mb: 1.5 }}>
                Same orders and the same street for everyone, once a day. Can you top today&apos;s board?
              </Typography>
              <Stack direction="row" spacing={1}>
                {ADVENTURES.map(({ mode, icon: Icon }) => {
                  const done = dailyDone(mode);
                  return (
                    <Button
                      key={mode}
                      fullWidth
                      variant="contained"
                      startIcon={done ? <CheckRoundedIcon /> : <Icon />}
                      onClick={() => router.push(`/play/${mode}?daily=1`)}
                      sx={{
                        bgcolor: done ? "rgba(255,255,255,0.35)" : "#fff",
                        color: done ? "#fff" : "#7C3AED",
                        "&:hover": { bgcolor: done ? "rgba(255,255,255,0.45)" : "#F5F3FF" },
                      }}
                    >
                      {MODE_LABELS[mode].split(" ")[1]}
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          </Card>
        </Stack>

        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="outlined" color="secondary" onClick={() => router.push("/scoreboard")}>
              Scoreboard
            </Button>
            <Button fullWidth variant="outlined" color="secondary" onClick={() => router.push("/my-scores")}>
              My scores
            </Button>
          </Stack>
          <Button fullWidth variant="text" onClick={() => router.push("/character")}>
            Switch character or colour
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
