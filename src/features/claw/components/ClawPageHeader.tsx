"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { CLIP, N, textGlow } from "@/design/neon";
import type { ReactNode } from "react";

/** Shared header for the claw screens: back button, glowing title, optional stat pill on the right. */
export default function ClawPageHeader({ title, subtitle, accent = N.claw, backTo = "/claw", right }: { title: string; subtitle?: string; accent?: string; backTo?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button variant="outlined" size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.push(backTo)}>
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        {right && (
          <Box
            sx={{
              px: 1.5,
              height: 42,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              clipPath: CLIP.button,
              bgcolor: N.panel,
              border: `1px solid ${N.panelEdge}`,
              color: N.text,
              fontFamily: "var(--font-arcade)",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {right}
          </Box>
        )}
      </Stack>
      <Box>
        <Typography variant="h2" component="h1" sx={{ color: accent, textShadow: textGlow(accent) }}>
          {title}
        </Typography>
        {subtitle && <Typography sx={{ color: N.textSoft, fontWeight: 700 }}>{subtitle}</Typography>}
      </Box>
    </Stack>
  );
}
