"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePendingRouter } from "@/components/PendingNavigation";
import BootSplash from "@/components/BootSplash";
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
  const { replace } = usePendingRouter();
  const hydrated = usePlayerHydrated();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character);

  const ready = hydrated && nickname.length > 0 && (!needCharacter || character !== null);

  useEffect(() => {
    if (!hydrated) return;
    if (!nickname) replace("/");
    else if (needCharacter && !character) replace("/character");
  }, [hydrated, nickname, character, needCharacter, replace]);

  if (!ready) return <BootSplash />;
  // Suspense so children may use useSearchParams() (daily-challenge routes).
  return <Suspense fallback={<BootSplash />}>{children}</Suspense>;
}
