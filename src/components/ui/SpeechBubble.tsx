import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { N } from "@/design/neon";

/**
 * Order bubble with a little tail, floating above customers in the 3D scenes.
 * Dark glass with a neon edge so it reads over the bright game worlds.
 * `tone` keeps its old "bubble fill" meaning for callers: passing a bright
 * colour (e.g. a rush-order red) now drives the border + glow instead.
 */
export default function SpeechBubble({
  children,
  tail = "bottom",
  tone,
  sx,
}: {
  children: ReactNode;
  tail?: "bottom" | "left" | "none";
  /** Accent colour; switch to the kitchen red for a rush order. */
  tone?: string;
  sx?: object;
}) {
  const accent = tone && tone !== "#FFFFFF" ? tone : N.panelEdge;
  const fill = "rgba(13,19,31,0.92)";
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1.25,
        borderRadius: 3,
        bgcolor: fill,
        color: N.text,
        border: `1.5px solid ${accent}`,
        boxShadow: `0 0 14px ${accent}40, 0 6px 18px rgba(0,0,0,0.45)`,
        ...(tail !== "none" && {
          "&::after": {
            content: '""',
            position: "absolute",
            width: 16,
            height: 16,
            bgcolor: fill,
            ...(tail === "bottom"
              ? {
                  bottom: -8,
                  left: 26,
                  borderRadius: "0 0 4px 0",
                  transform: "rotate(45deg)",
                  borderRight: `1.5px solid ${accent}`,
                  borderBottom: `1.5px solid ${accent}`,
                }
              : {
                  left: -8,
                  top: "50%",
                  mt: "-8px",
                  borderRadius: "0 0 0 4px",
                  transform: "rotate(45deg)",
                  borderLeft: `1.5px solid ${accent}`,
                  borderBottom: `1.5px solid ${accent}`,
                }),
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
