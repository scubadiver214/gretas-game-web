"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Panel from "@/components/ui/Panel";
import { N, textGlow } from "@/design/neon";
import { AVATAR_BY_ID } from "../content/avatars";
import { RARITY_LABELS, type PrizeDef } from "../content/prizes";
import { RARITY_COLORS } from "./rarity";

const ToyTurntable = dynamic(() => import("../render/ToyTurntable"), { ssr: false });

/**
 * Shown the moment a prize lands in the chute: the toy spinning on a
 * turntable, its name and rarity, the points, and any avatar it unlocked.
 */
export default function PrizeCelebration({
  prize,
  points,
  cheer,
  count,
  unlockedAvatars = [],
  onContinue,
}: {
  prize: PrizeDef;
  points: number;
  cheer: string;
  /** How many of this prize the player now owns (1 = brand new). */
  count?: number;
  unlockedAvatars?: string[];
  onContinue: () => void;
}) {
  const accent = RARITY_COLORS[prize.rarity];
  const isNew = count === 1;
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 6, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(5,8,13,0.6)" }}>
      <Panel accent={accent} padding={2.25} sx={{ maxWidth: 400, width: "100%" }}>
        <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              color: accent,
              textShadow: textGlow(accent),
              animation: "cheerIn 520ms cubic-bezier(.2,1.7,.4,1) both",
              "@keyframes cheerIn": { from: { transform: "scale(0.4) rotate(-6deg)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
            }}
          >
            {cheer}
          </Typography>
          {/* Fade/slide only: a scale animation here would make the 3D canvas measure itself mid-animation. */}
          <Box
            sx={{
              width: "100%",
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${accent}33, transparent)`,
              animation: "prizeIn 500ms 100ms ease-out both",
              "@keyframes prizeIn": { from: { transform: "translateY(18px)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
            }}
          >
            <ToyTurntable prize={prize} size={200} glow={accent} />
          </Box>
          <Typography variant="h3" component="p" sx={{ color: N.text }}>
            {prize.name}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
            <Chip label={RARITY_LABELS[prize.rarity]} sx={{ bgcolor: accent, color: N.bg, fontWeight: 700 }} />
            {isNew && <Chip label="New toy!" sx={{ bgcolor: N.pop, color: N.white, fontWeight: 700 }} />}
            {count !== undefined && count > 1 && <Chip label={`You have ${count}`} variant="outlined" />}
            <Chip icon={<StarRoundedIcon />} label={`+${points}`} sx={{ bgcolor: N.bgRaise, color: N.text, "& .MuiChip-icon": { color: N.sun } }} />
          </Stack>
          <Typography sx={{ color: N.textSoft }}>{prize.description}</Typography>
          {unlockedAvatars.length > 0 && (
            <Box
              sx={{
                width: "100%",
                p: 1.25,
                bgcolor: `${N.sun}1A`,
                border: `1px solid ${N.sun}66`,
                borderRadius: 2,
                animation: "avatarIn 500ms 400ms cubic-bezier(.2,1.6,.4,1) both",
                "@keyframes avatarIn": { from: { transform: "translateY(12px)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
              }}
            >
              <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.sun, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                New avatar unlocked!
              </Typography>
              <Typography sx={{ color: N.text, fontWeight: 800 }}>{unlockedAvatars.map((id) => AVATAR_BY_ID[id]?.name ?? id).join(" · ")}</Typography>
            </Box>
          )}
          <Button size="large" fullWidth variant="contained" color="success" onClick={onContinue} autoFocus>
            Keep playing!
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
