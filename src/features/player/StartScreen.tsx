"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LocalPizzaRoundedIcon from "@mui/icons-material/LocalPizzaRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PageContainer from "@/components/PageContainer";
import { usePlayerHydrated, usePlayerStore } from "./store";
import { NICKNAME_MAX, normalizeNickname, validateNickname } from "./types";

export default function StartScreen() {
  const router = useRouter();
  const hydrated = usePlayerHydrated();
  const savedNickname = usePlayerStore((s) => s.nickname);
  const setNickname = usePlayerStore((s) => s.setNickname);
  // null = untouched; show the saved nickname until the player types.
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = typed ?? (hydrated ? savedNickname : "");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateNickname(value);
    if (err) {
      setError(err);
      return;
    }
    setNickname(normalizeNickname(value));
    router.push("/character");
  };

  return (
    <PageContainer>
      <Stack spacing={3} sx={{ flex: 1, justifyContent: "center", py: 4 }}>
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 112,
              height: 112,
              mx: "auto",
              mb: 2,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: "#FDE68A",
              boxShadow: "0 12px 30px rgba(242,84,45,0.25)",
              animation: "wiggle 3s ease-in-out infinite",
              "@keyframes wiggle": {
                "0%, 100%": { transform: "rotate(-6deg)" },
                "50%": { transform: "rotate(6deg)" },
              },
            }}
          >
            <LocalPizzaRoundedIcon sx={{ fontSize: 64, color: "#F2542D" }} />
          </Box>
          <Typography variant="h1" component="h1" color="primary">
            Greta&apos;s Game
          </Typography>
          <Typography variant="h3" component="p" sx={{ color: "secondary.main" }}>
            for fun
          </Typography>
          <Typography sx={{ mt: 1.5, color: "text.secondary" }}>
            Plan your own pizza adventure! Cook in the kitchen or deliver by bike.
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="What's your name?"
              placeholder="Type a nickname"
              value={value}
              onChange={(e) => {
                setTyped(e.target.value);
                if (error) setError(null);
              }}
              error={Boolean(error)}
              helperText={error ?? `${value.trim().length}/${NICKNAME_MAX}`}
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="go"
              slotProps={{ htmlInput: { maxLength: NICKNAME_MAX, "aria-label": "Nickname" } }}
            />
            <Button type="submit" size="large" variant="contained" disabled={!hydrated}>
              Let&apos;s play!
            </Button>
            <Button
              variant="text"
              color="secondary"
              startIcon={<EmojiEventsRoundedIcon />}
              onClick={() => router.push("/scoreboard")}
            >
              See the scoreboard
            </Button>
          </Stack>
        </Box>
      </Stack>
    </PageContainer>
  );
}
