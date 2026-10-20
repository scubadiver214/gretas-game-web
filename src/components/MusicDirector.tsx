"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { music } from "@/lib/fx";

function isGameplayPath(pathname: string): boolean {
  return pathname.startsWith("/play/");
}

/**
 * Soundtrack lives on hub screens only (character select, adventure, scores…).
 * Games stay quiet so kids can focus on play.
 */
export default function MusicDirector() {
  const pathname = usePathname();

  useEffect(() => {
    if (isGameplayPath(pathname)) {
      music.stop(0.4);
      return;
    }

    music.play("menu");

    // Browsers block autoplay until a tap; retry on the first pointer so music
    // can start after the player types a name or taps a card.
    const resume = () => music.play("menu");
    window.addEventListener("pointerdown", resume);
    return () => window.removeEventListener("pointerdown", resume);
  }, [pathname]);

  return null;
}
