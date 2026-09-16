"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PageContainer from "@/components/PageContainer";
import Panel from "@/components/ui/Panel";
import { SettingsToggles } from "@/components/HUD";
import { C, hardShadow } from "@/design/tokens";
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
      <Stack spacing={2.5} sx={{ flex: 1, justifyContent: "center", py: 4 }}>
        {/* Shop sign: a fat pizza token sitting on a tomato-topped card. */}
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 118,
              height: 118,
              mx: "auto",
              mb: 1.5,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 64,
              lineHeight: 1,
              bgcolor: C.sun,
              boxShadow: hardShadow(C.sunDeep, 8),
              animation: "signWiggle 3s ease-in-out infinite",
              "@keyframes signWiggle": {
                "0%, 100%": { transform: "rotate(-7deg)" },
                "50%": { transform: "rotate(7deg)" },
              },
            }}
            aria-hidden
          >
            🍕
          </Box>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              color: C.white,
              WebkitTextStroke: `9px ${C.tomatoDeep}`,
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 5px 0 rgba(22,33,46,0.18))",
            }}
          >
            Greta&apos;s Pizza
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              display: "inline-block",
              px: 2,
              py: 0.5,
              borderRadius: 999,
              bgcolor: C.blue,
              color: C.white,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.1rem",
              boxShadow: hardShadow(C.blueDeep, 4),
            }}
          >
            Kitchen &amp; Delivery
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <SettingsToggles size="small" />
        </Box>

        <Panel accent={C.tomato}>
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
              <Button
                type="submit"
                size="large"
                variant="contained"
                color="success"
                disabled={!hydrated}
                startIcon={<PlayArrowRoundedIcon />}
              >
                Let&apos;s play!
              </Button>
              <Button
                variant="text"
                color="primary"
                startIcon={<EmojiEventsRoundedIcon />}
                onClick={() => router.push("/scoreboard")}
              >
                See the scoreboard
              </Button>
            </Stack>
          </Box>
        </Panel>
      </Stack>
    </PageContainer>
  );
}
