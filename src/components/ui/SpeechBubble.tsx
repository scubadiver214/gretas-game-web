import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { C, floatShadow } from "@/design/tokens";

/**
 * White order bubble with a little tail, exactly like the "🍕 4" callouts the
 * customers in the reference art hold up. Used for the current pizza order.
 */
export default function SpeechBubble({
  children,
  tail = "bottom",
  tone = C.white,
  sx,
}: {
  children: ReactNode;
  tail?: "bottom" | "left" | "none";
  /** Bubble fill; switch to tomato for a rush order. */
  tone?: string;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1.25,
        borderRadius: 4,
        bgcolor: tone,
        boxShadow: floatShadow,
        ...(tail !== "none" && {
          "&::after": {
            content: '""',
            position: "absolute",
            width: 16,
            height: 16,
            bgcolor: tone,
            ...(tail === "bottom"
              ? { bottom: -6, left: 26, borderRadius: "0 0 4px 0", transform: "rotate(45deg)" }
              : { left: -6, top: "50%", mt: "-8px", borderRadius: "0 0 0 4px", transform: "rotate(45deg)" }),
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
