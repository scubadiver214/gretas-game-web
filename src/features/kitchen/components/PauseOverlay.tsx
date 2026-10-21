"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";

export default function PauseOverlay({ onResume, onRestart, onQuit, onHelp }: { onResume: () => void; onRestart: () => void; onQuit: () => void; onHelp: () => void }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 6, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(5,8,13,0.6)" }}>
      <Panel accent={N.kitchen} padding={2.5} sx={{ maxWidth: 340, width: "100%" }}>
        <Stack spacing={1.25}>
          <Typography variant="h2" component="h2" sx={{ textAlign: "center", color: N.kitchen }}>
            Kitchen paused
          </Typography>
          <Typography sx={{ textAlign: "center", color: N.textSoft }}>The customers will wait. Press Esc to get cooking again.</Typography>
          <Button size="large" variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onResume} autoFocus>
            Resume
          </Button>
          <Button variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={onHelp}>
            How to play
          </Button>
          <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={onRestart}>
            Restart shift
          </Button>
          <Button variant="text" onClick={onQuit}>
            Quit to games
          </Button>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <SettingsToggles />
          </Box>
        </Stack>
      </Panel>
    </Box>
  );
}
