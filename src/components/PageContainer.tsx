import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";
import { N } from "@/design/neon";

/**
 * Mobile-first page frame in the neon-arcade look: near-black navy backdrop
 * with ambient accent glows and a perspective grid floor, then a single
 * safe-area aware column capped so it still reads well on a tablet.
 */
export default function PageContainer({
  children,
  maxWidth = 480,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Box
      component="main"
      sx={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: N.bg,
        overflow: "hidden",
        pt: "max(16px, env(safe-area-inset-top))",
        pb: "max(20px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Ambient glows: brand green upper-left, hot magenta lower-right. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(520px 340px at 12% -4%, ${N.brand}17, transparent 70%),
            radial-gradient(560px 400px at 95% 104%, ${N.pop}14, transparent 70%)`,
        }}
      />
      {/* Perspective grid floor, fading out towards the horizon. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: "-20%",
          right: "-20%",
          bottom: 0,
          height: "38dvh",
          backgroundImage: `linear-gradient(${N.panelEdge}B3 1px, transparent 1px),
            linear-gradient(90deg, ${N.panelEdge}B3 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          transform: "perspective(420px) rotateX(58deg)",
          transformOrigin: "center bottom",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
        }}
      />
      <Container
        disableGutters
        sx={{
          position: "relative",
          zIndex: 1,
          maxWidth: `${maxWidth}px !important`,
          px: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
