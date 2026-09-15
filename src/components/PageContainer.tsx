import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { ReactNode } from "react";

/**
 * Mobile-first page frame: single column, safe-area aware padding, capped
 * width so it also looks good on a tablet/desktop.
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
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        pt: "max(16px, env(safe-area-inset-top))",
        pb: "max(20px, env(safe-area-inset-bottom))",
        background:
          "radial-gradient(1200px 500px at 50% -200px, #FFE3C2 0%, #FFF7EC 60%)",
      }}
    >
      <Container disableGutters sx={{ maxWidth: `${maxWidth}px !important`, px: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Container>
    </Box>
  );
}
