"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ScreenRotationRoundedIcon from "@mui/icons-material/ScreenRotationRounded";
import { N } from "@/design/neon";

/** Covers the kitchen while a phone or tablet is held upright. */
export default function RotateOverlay({ canLock, onLock, onQuit }: { canLock: boolean; onLock: () => void; onQuit: () => void }) {
  return (
    <Box
      role="dialog"
      aria-label="Turn your device sideways"
      sx={{ position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", p: 3, bgcolor: "rgba(5,8,13,0.94)", textAlign: "center" }}
    >
      <Stack spacing={2} sx={{ alignItems: "center", maxWidth: 320 }}>
        <ScreenRotationRoundedIcon
          aria-hidden
          sx={{
            fontSize: 88,
            color: N.kitchen,
            filter: `drop-shadow(0 0 14px ${N.kitchen}99)`,
            animation: "turnPhone 1.8s ease-in-out infinite",
            "@keyframes turnPhone": { "0%,20%": { transform: "rotate(0deg)" }, "55%,100%": { transform: "rotate(-90deg)" } },
          }}
        />
        <Typography variant="h3" component="h2" sx={{ color: N.text }}>
          Turn your device sideways
        </Typography>
        <Typography sx={{ color: N.textSoft }}>The kitchen needs the whole width. Rotate to landscape to keep cooking.</Typography>
        {canLock && (
          <Button size="large" variant="contained" color="success" onClick={onLock}>
            Play in landscape
          </Button>
        )}
        <Button variant="text" onClick={onQuit}>
          Back to games
        </Button>
      </Stack>
    </Box>
  );
}
