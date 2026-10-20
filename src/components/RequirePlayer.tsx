"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { usePlayerHydrated, usePlayerStore } from "@/features/player/store";
import { N } from "@/design/neon";

/**
 * Guards game screens: waits for the persisted player to load, then bounces
 * to the start or character screen if something is missing.
 */
export default function RequirePlayer({
  children,
  needCharacter = true,
}: {
  children: ReactNode;
  needCharacter?: boolean;
}) {
  const router = useRouter();
  const hydrated = usePlayerHydrated();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character);

  const ready = hydrated && nickname.length > 0 && (!needCharacter || character !== null);

  useEffect(() => {
    if (!hydrated) return;
    if (!nickname) router.replace("/");
    else if (needCharacter && !character) router.replace("/character");
  }, [hydrated, nickname, character, needCharacter, router]);

  if (!ready) return <Spinner />;
  // Suspense so children may use useSearchParams() (daily-challenge routes).
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

/** Bouncing pizza instead of a spinner: on-theme and no layout shift. */
function Spinner() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: N.bg }}>
      <Box
        aria-label="Loading"
        role="status"
        sx={{
          fontSize: 56,
          lineHeight: 1,
          filter: `drop-shadow(0 0 18px ${N.brand}99)`,
          animation: "loadBounce 900ms ease-in-out infinite",
          "@keyframes loadBounce": {
            "0%,100%": { transform: "translateY(0) rotate(-8deg)" },
            "50%": { transform: "translateY(-18px) rotate(8deg)" },
          },
        }}
      >
        🍕
      </Box>
    </Box>
  );
}
