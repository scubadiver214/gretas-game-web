"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";
import ReducedMotionToggle from "./ReducedMotionToggle";

export default function PauseOverlay({ onResume, onRestart, onQuit }: { onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(5,8,13,0.6)" }}>
      <Panel accent={N.claw} padding={2.5} sx={{ maxWidth: 340, width: "100%" }}>
        <Stack spacing={1.25}>
          <Typography variant="h2" component="h2" sx={{ textAlign: "center", color: N.claw }}>
            Paused
          </Typography>
          <Typography sx={{ textAlign: "center", color: N.textSoft }}>Your toys are safe. Take all the time you need.</Typography>
          <Button size="large" variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onResume} autoFocus>
            Resume
          </Button>
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={onRestart}>
            Restart level
          </Button>
          <Button variant="text" onClick={onQuit}>
            Back to the arcade
          </Button>
          <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", alignItems: "center" }}>
            <SettingsToggles />
            <ReducedMotionToggle />
          </Stack>
        </Stack>
      </Panel>
    </Box>
  );
}
