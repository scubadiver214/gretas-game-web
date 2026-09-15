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
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { usePersonalBests } from "@/features/scores/hooks";
import { CHARACTER_LABELS, type GameMode } from "@/features/player/types";

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
  const character = usePlayerStore((s) => s.character);
  const bests = usePersonalBests(nickname);
  const bestFor = (mode: GameMode) => bests.data?.find((b) => b.mode === mode)?.score;

  return (
    <PageContainer>
      <Stack spacing={2.5} sx={{ flex: 1, py: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {nickname} as {character ? CHARACTER_LABELS[character] : ""}
          </Typography>
          <Typography variant="h2" component="h1">
            What do you want to do today?
          </Typography>
        </Box>

        <Stack spacing={2} sx={{ flex: 1 }}>
          {ADVENTURES.map(({ mode, title, blurb, icon: Icon, gradient }) => (
            <Card key={mode} sx={{ flex: 1, minHeight: 170, display: "flex" }}>
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
                    {bestFor(mode) !== undefined && (
                      <Chip
                        size="small"
                        icon={<EmojiEventsRoundedIcon />}
                        label={`Your best: ${bestFor(mode)}`}
                        sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.9)", color: "#2B2D42" }}
                      />
                    )}
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        <Stack spacing={1}>
          <Button fullWidth variant="outlined" color="secondary" onClick={() => router.push("/scoreboard")}>
            Scoreboard
          </Button>
          <Button fullWidth variant="text" onClick={() => router.push("/character")}>
            Switch character
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
