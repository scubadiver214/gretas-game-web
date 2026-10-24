"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { BackToShopButton, SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N, textGlow } from "@/design/neon";
import { AVATAR_BY_ID } from "../content/avatars";
import { PRIZE_BY_ID } from "../content/prizes";
import type { WorldDef } from "../content/worlds";
import { RARITY_COLORS } from "./rarity";
import ReducedMotionToggle from "./ReducedMotionToggle";

const ToyTurntable = dynamic(() => import("../render/ToyTurntable"), { ssr: false });

/**
 * Pre-game card for a world's mystery machine: shows the legendary prize and
 * the avatar it unlocks, and explains the one rule - the claw sweeps on its
 * own, press GRAB when it is right above the prize.
 */
export default function MysteryMenu({ world, touch, alreadyWon, onPlay, onClose }: { world: WorldDef; touch: boolean; alreadyWon: boolean; onPlay: () => void; onClose: () => void }) {
  const prize = PRIZE_BY_ID[world.mysteryPrize];
  const avatar = AVATAR_BY_ID[world.avatar];
  const accent = N.sun;
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", p: 2, bgcolor: "rgba(5,8,13,0.62)", overflow: "auto" }}>
      <Box sx={{ position: "relative", maxWidth: 440, width: "100%", m: "auto" }}>
        <Panel accent={accent} padding={2.25}>
          <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
            <Typography variant="h2" component="h1" sx={{ color: accent, textShadow: textGlow(accent), px: 4 }}>
              Mystery Machine
            </Typography>
            <Chip label={world.name} sx={{ bgcolor: world.palette.glow, color: N.bg, fontWeight: 700 }} />
            <Box sx={{ width: "100%", background: `radial-gradient(closest-side, ${RARITY_COLORS[prize.rarity]}33, transparent)` }}>
              <ToyTurntable prize={prize} size={190} glow={RARITY_COLORS[prize.rarity]} />
            </Box>
            <Typography variant="h3" component="p">
              {prize.name}
            </Typography>
            <Typography sx={{ color: N.textSoft }}>{prize.description}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
              <Chip label="Legendary" sx={{ bgcolor: RARITY_COLORS.legendary, color: N.bg, fontWeight: 700 }} />
              {avatar && <Chip label={alreadyWon ? `${avatar.name} avatar: yours!` : `Unlocks the ${avatar.name} avatar`} variant="outlined" />}
            </Stack>
            <Typography sx={{ color: N.text, fontSize: "1.02rem" }}>
              The claw slides back and forth all by itself. Watch it, wait, and {touch ? "tap GRAB" : "press GRAB (or Space)"} the moment it hangs right over the prize. Line it up and it&apos;s yours - no luck needed.
            </Typography>
            <Button size="large" fullWidth variant="contained" color="warning" startIcon={<PlayArrowRoundedIcon />} onClick={onPlay} autoFocus>
              {alreadyWon ? "Play again" : "Try the mystery machine"}
            </Button>
            <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", alignItems: "center" }}>
              <SettingsToggles />
              <ReducedMotionToggle />
            </Stack>
          </Stack>
        </Panel>
        <BackToShopButton onClick={onClose} />
      </Box>
    </Box>
  );
}
