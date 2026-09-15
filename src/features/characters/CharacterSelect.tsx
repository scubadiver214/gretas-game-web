"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { CHARACTER_LABELS, type CharacterId } from "@/features/player/types";

const CharacterPreview = dynamic(() => import("./CharacterPreview"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" width="100%" height="100%" />,
});

const OPTIONS: { id: CharacterId; tagline: string; color: string }[] = [
  { id: "girl", tagline: "Loves extra cheese", color: "#E85D9A" },
  { id: "boy", tagline: "Fastest bike in town", color: "#3B82F6" },
];

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const saved = usePlayerStore((s) => s.character);
  const setCharacter = usePlayerStore((s) => s.setCharacter);
  const [selected, setSelected] = useState<CharacterId | null>(saved);

  return (
    <PageContainer>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h2" component="h1">
            Hi {nickname}!
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>Who do you want to be today?</Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <Card
                key={opt.id}
                sx={{
                  flex: 1,
                  outline: active ? `4px solid ${opt.color}` : "4px solid transparent",
                  transition: "outline-color 150ms ease, transform 150ms ease",
                  transform: active ? "translateY(-4px)" : "none",
                }}
              >
                <CardActionArea
                  onClick={() => setSelected(opt.id)}
                  aria-pressed={active}
                  sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
                >
                  <Box sx={{ height: 260, bgcolor: active ? "#FFF1D6" : "#F6F1EA" }}>
                    <CharacterPreview character={opt.id} active={active} />
                  </Box>
                  <Box sx={{ p: 2, textAlign: "center", position: "relative" }}>
                    {active && (
                      <CheckCircleRoundedIcon
                        sx={{ position: "absolute", top: -14, right: 12, color: opt.color, fontSize: 30, bgcolor: "#fff", borderRadius: "50%" }}
                      />
                    )}
                    <Typography variant="h4">{CHARACTER_LABELS[opt.id]}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {opt.tagline}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>

        <Button
          size="large"
          variant="contained"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            setCharacter(selected);
            router.push("/adventure");
          }}
        >
          {selected ? `Play as ${CHARACTER_LABELS[selected]}` : "Pick a character"}
        </Button>
        <Button variant="text" onClick={() => router.push("/")}>
          Change name
        </Button>
      </Stack>
    </PageContainer>
  );
}

export default function CharacterSelect() {
  return (
    <RequirePlayer needCharacter={false}>
      <Inner />
    </RequirePlayer>
  );
}
