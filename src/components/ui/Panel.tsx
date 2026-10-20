import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { CLIP, N, panelGlow } from "@/design/neon";

/**
 * Dark angular panel, the building block of the neon-arcade look. `accent`
 * paints a glowing spine along the top edge and tints the panel's halo.
 */
export default function Panel({
  children,
  accent,
  padding = 2.5,
  sx,
}: {
  children: ReactNode;
  accent?: string;
  padding?: number;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: N.panel,
        clipPath: CLIP.card,
        border: `1px solid ${accent ? `${accent}59` : N.panelEdge}`,
        boxShadow: panelGlow(accent ?? N.panelEdge),
        overflow: "hidden",
        ...sx,
      }}
    >
      {accent && (
        <Box aria-hidden sx={{ height: 4, bgcolor: accent, boxShadow: `0 0 14px ${accent}` }} />
      )}
      <Box sx={{ p: padding }}>{children}</Box>
    </Box>
  );
}
