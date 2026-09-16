"use client";

import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { C } from "@/design/tokens";

/**
 * Full-viewport game frame. The 3D canvas fills the background; HUD slots are
 * absolutely positioned above it and respect the device safe areas.
 */
export default function GameShell({
  scene,
  top,
  bottom,
  overlay,
}: {
  scene: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
  overlay?: ReactNode;
}) {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        bgcolor: C.blueSoft,
        userSelect: "none",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0 }}>{scene}</Box>
      {top && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            p: 1.5,
            pt: "max(12px, env(safe-area-inset-top))",
            pointerEvents: "none",
            "& > *": { pointerEvents: "auto" },
          }}
        >
          {top}
        </Box>
      )}
      {bottom && (
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            pb: "max(16px, env(safe-area-inset-bottom))",
            pointerEvents: "none",
            "& > *": { pointerEvents: "auto" },
          }}
        >
          {bottom}
        </Box>
      )}
      {overlay}
    </Box>
  );
}
