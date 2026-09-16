import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";
import IsoBackdrop from "@/components/ui/IsoBackdrop";

/**
 * Mobile-first page frame: the shop-floor backdrop, then a single safe-area
 * aware column capped so it still reads well on a tablet.
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
        pt: "max(16px, env(safe-area-inset-top))",
        pb: "max(20px, env(safe-area-inset-bottom))",
      }}
    >
      <IsoBackdrop />
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
