"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { usePlayerHydrated, usePlayerStore } from "@/features/player/store";

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

function Spinner() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <CircularProgress color="primary" />
    </Box>
  );
}
