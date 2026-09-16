import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { C, RADIUS, floatShadow } from "@/design/tokens";

/**
 * Flat white card with a fat radius. `accent` paints a solid colour strip along
 * the top, which is how the shop signage is built in the reference art.
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
        bgcolor: C.white,
        borderRadius: `${RADIUS.panel}px`,
        boxShadow: floatShadow,
        overflow: "hidden",
        ...sx,
      }}
    >
      {accent && <Box aria-hidden sx={{ height: 10, bgcolor: accent }} />}
      <Box sx={{ p: padding }}>{children}</Box>
    </Box>
  );
}
