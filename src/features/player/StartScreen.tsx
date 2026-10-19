"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import NeonPage from "@/components/NeonPage";
import { SettingsToggles } from "@/components/HUD";
import { CLIP, N, neonGlow, panelGlow, textGlow } from "@/design/neon";
import { usePlayerHydrated, usePlayerStore } from "./store";
import { NICKNAME_MAX, normalizeNickname, validateNickname } from "./types";

export default function StartScreen() {
  const router = useRouter();
  const hydrated = usePlayerHydrated();
  const savedNickname = usePlayerStore((s) => s.nickname);
  const setNickname = usePlayerStore((s) => s.setNickname);
  const character = usePlayerStore((s) => s.character);
  const setCharacter = usePlayerStore((s) => s.setCharacter);
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
    // The dashboard is the first stop after entering a name - default a
    // character so games are playable right away. Players can still pick a
    // different look later by tapping their avatar in the dashboard.
    if (!character) setCharacter("girl");
    router.push("/adventure");
  };

  return (
    <NeonPage>
      <Stack spacing={2} sx={{ flex: 1, justifyContent: "center", py: 3 }}>
        {/* Wordmark */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: "var(--font-arcade)",
              fontWeight: 700,
              fontSize: "clamp(2.4rem, 11vw, 3.4rem)",
              lineHeight: 1,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: N.brand,
              textShadow: textGlow(N.brand),
            }}
          >
            Greta Games
          </Typography>
          <Typography
            sx={{
              mt: 1,
              display: "inline-block",
              px: 1.75,
              py: 0.4,
              clipPath: CLIP.button,
              bgcolor: N.pop,
              color: N.white,
              fontFamily: "var(--font-arcade)",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              boxShadow: neonGlow(N.pop, 10),
            }}
          >
            for fun!
          </Typography>
        </Box>

        {/* Hero art: Greta mid-leap, framed by an angular neon panel. */}
        <Box
          sx={{
            position: "relative",
            mx: "auto",
            width: "min(72vw, 300px)",
            aspectRatio: "3 / 4",
            maxHeight: "38dvh",
            clipPath: CLIP.card,
            boxShadow: panelGlow(N.brand),
            bgcolor: N.panel,
          }}
        >
          <Image
            src="/characters/greta-neon.jpg"
            alt="Greta leaping through neon lights"
            fill
            priority
            sizes="(max-width: 480px) 72vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <SettingsToggles size="small" />
        </Box>

        {/* Name + play: dark panel with a neon edge. */}
        <Box
          sx={{
            clipPath: CLIP.card,
            bgcolor: N.panel,
            boxShadow: panelGlow(N.panelEdge),
            border: `1px solid ${N.panelEdge}`,
            p: 2.5,
          }}
        >
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
                slotProps={{
                  htmlInput: { maxLength: NICKNAME_MAX, "aria-label": "Nickname" },
                  // Keep the label floated: the saved nickname arrives after
                  // hydration and the overlap looks broken on the dark panel.
                  inputLabel: { shrink: true },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { bgcolor: N.bgRaise, color: N.text },
                  "& .MuiInputLabel-root": { color: N.textSoft },
                  "& .MuiInputLabel-root.Mui-focused": { color: N.brand },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": { borderWidth: 2, borderColor: N.panelEdge },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: N.textSoft },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: N.brand,
                  },
                  "& .MuiFormHelperText-root": { color: N.textSoft },
                }}
              />
              <ButtonBase
                type="submit"
                disabled={!hydrated}
                sx={{
                  height: 56,
                  clipPath: CLIP.button,
                  bgcolor: N.brand,
                  color: N.bg,
                  fontFamily: "var(--font-arcade)",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  boxShadow: neonGlow(N.brand),
                  transition: "transform 90ms ease, box-shadow 90ms ease",
                  "&:hover": { boxShadow: neonGlow(N.brand, 26) },
                  "&:active": { transform: "translateY(2px)" },
                  "&.Mui-disabled": { bgcolor: N.panelEdge, color: N.textSoft, boxShadow: "none" },
                }}
              >
                <PlayArrowRoundedIcon sx={{ mr: 0.75 }} /> Let&apos;s play!
              </ButtonBase>
              <ButtonBase
                onClick={() => router.push("/scoreboard")}
                sx={{
                  height: 44,
                  clipPath: CLIP.button,
                  color: N.delivery,
                  border: `1px solid ${N.delivery}66`,
                  fontFamily: "var(--font-arcade)",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  "&:hover": { bgcolor: `${N.delivery}14`, boxShadow: `0 0 14px ${N.delivery}40` },
                }}
              >
                <EmojiEventsRoundedIcon sx={{ mr: 0.75, fontSize: 20 }} /> See the scoreboard
              </ButtonBase>
            </Stack>
          </Box>
        </Box>
      </Stack>
    </NeonPage>
  );
}
