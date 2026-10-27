"use client";

import { usePendingRouter } from "@/components/PendingNavigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { CLIP, N, panelGlow, textGlow } from "@/design/neon";
import { ACHIEVEMENTS, type AchievementDef } from "./achievements";
import { usePlayerStore } from "./store";
import { BIKE_SKINS } from "./types";

/** Metal hues kept from the old theme, used as neon borders/glows on dark panels. */
const TIER: Record<AchievementDef["tier"], string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: N.sun,
};

function Inner() {
  const { push } = usePendingRouter();
  const achievements = usePlayerStore((s) => s.achievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!achievements[b.id]) - Number(!!achievements[a.id]));

  return (
    <PageContainer maxWidth={560}>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button variant="outlined" size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => push("/adventure")}>
            Back
          </Button>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              px: 1.75,
              height: 42,
              display: "grid",
              placeItems: "center",
              clipPath: CLIP.button,
              bgcolor: N.panel,
              border: `1px solid ${N.panelEdge}`,
              color: N.text,
              fontFamily: "var(--font-arcade)",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            🏅 {unlockedCount} / {ACHIEVEMENTS.length}
          </Box>
        </Stack>

        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontFamily: "var(--font-arcade)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: N.sun,
              textShadow: textGlow(N.sun),
            }}
          >
            Trophy shelf
          </Typography>
          <Typography sx={{ color: N.textSoft, fontWeight: 700 }}>
            Play well to win trophies. Some unlock new bike paint!
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(152px, 1fr))", gap: 1.75 }}>
          {sorted.map((a) => {
            const when = achievements[a.id];
            const unlocked = !!when;
            const skin = BIKE_SKINS.find((s) => s.unlockedBy === a.id);
            const tier = TIER[a.tier];
            return (
              <Box
                key={a.id}
                sx={{
                  position: "relative",
                  p: 1.5,
                  pt: 9.5,
                  textAlign: "center",
                  clipPath: CLIP.card,
                  bgcolor: N.panel,
                  border: `1px solid ${unlocked ? tier : N.panelEdge}`,
                  boxShadow: unlocked ? panelGlow(tier) : "0 4px 14px rgba(0,0,0,0.4)",
                }}
              >
                {/* Medal disc pinned to the top of the card (kept inside the corner clip). */}
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    top: 10,
                    left: "50%",
                    ml: "-29px",
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 30,
                    lineHeight: 1,
                    bgcolor: N.bgRaise,
                    border: `2px solid ${unlocked ? tier : N.panelEdge}`,
                    boxShadow: unlocked ? `0 0 14px ${tier}80` : "none",
                    filter: unlocked ? "none" : "grayscale(1)",
                  }}
                >
                  {unlocked ? a.emoji : <LockRoundedIcon sx={{ color: N.textSoft }} />}
                </Box>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, mt: 0.5, color: unlocked ? N.text : N.textSoft }}>
                  {a.title}
                </Typography>
                <Typography variant="body2" sx={{ color: N.textSoft, minHeight: 40, fontSize: "0.85rem" }}>
                  {a.description}
                </Typography>
                {skin && (
                  <Chip
                    size="small"
                    label={`${skin.label} bike`}
                    sx={{
                      mt: 0.75,
                      bgcolor: unlocked ? skin.frame : N.panelEdge,
                      color: unlocked ? N.white : N.textSoft,
                      height: 26,
                    }}
                  />
                )}
                {unlocked && (
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: N.textSoft }}>
                    {new Date(when).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Stack>
    </PageContainer>
  );
}

export default function Trophies() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
