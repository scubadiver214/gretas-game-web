"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { C, RADIUS, floatShadow, hardShadow } from "@/design/tokens";
import { ACHIEVEMENTS, type AchievementDef } from "./achievements";
import { usePlayerStore } from "./store";
import { BIKE_SKINS } from "./types";

const TIER: Record<AchievementDef["tier"], { fill: string; edge: string }> = {
  bronze: { fill: C.crust, edge: C.crustDeep },
  silver: { fill: "#B9C4CF", edge: "#8C99A6" },
  gold: { fill: C.sun, edge: C.sunDeep },
};

function Inner() {
  const router = useRouter();
  const achievements = usePlayerStore((s) => s.achievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!achievements[b.id]) - Number(!!achievements[a.id]));

  return (
    <PageContainer maxWidth={560}>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button variant="outlined" size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.push("/adventure")}>
            Back
          </Button>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              px: 1.75,
              height: 42,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              bgcolor: C.white,
              boxShadow: floatShadow,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.1rem",
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
              color: C.white,
              WebkitTextStroke: `8px ${C.blueDeep}`,
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 4px 0 rgba(22,33,46,0.16))",
            }}
          >
            Trophy shelf
          </Typography>
          <Typography sx={{ color: C.ink, fontWeight: 700 }}>
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
                  pt: 4,
                  textAlign: "center",
                  borderRadius: `${RADIUS.panel}px`,
                  bgcolor: unlocked ? C.white : "#EEF2F6",
                  boxShadow: hardShadow(unlocked ? tier.edge : C.slateDeep, 6),
                }}
              >
                {/* Medal disc overlapping the top edge of the card. */}
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    top: -18,
                    left: "50%",
                    ml: "-29px",
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 30,
                    lineHeight: 1,
                    bgcolor: unlocked ? tier.fill : C.slate,
                    boxShadow: hardShadow(unlocked ? tier.edge : C.slateDeep, 4),
                    filter: unlocked ? "none" : "grayscale(1)",
                  }}
                >
                  {unlocked ? a.emoji : <LockRoundedIcon sx={{ color: C.inkSoft }} />}
                </Box>
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, mt: 0.5 }}>{a.title}</Typography>
                <Typography variant="body2" sx={{ color: C.inkSoft, minHeight: 40, fontSize: "0.85rem" }}>
                  {a.description}
                </Typography>
                {skin && (
                  <Chip
                    size="small"
                    label={`${skin.label} bike`}
                    sx={{ mt: 0.75, bgcolor: skin.frame, color: "#fff", height: 26 }}
                  />
                )}
                {unlocked && (
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: C.inkSoft }}>
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
