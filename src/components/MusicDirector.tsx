"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { music, type MusicTrackId } from "@/lib/fx";

function listenForPlayback(): () => void {
  // Browsers block autoplay until a tap; retry on the first pointer.
  const resume = () => music.play("menu");
  window.addEventListener("pointerdown", resume);
  return () => window.removeEventListener("pointerdown", resume);
}

/**
 * Soundtrack for every screen. Most rounds silence it from the countdown
 * until play ends; the kitchen keeps a quiet bed. Menus, the scoreboard,
 * and results keep the shop playlist.
 */
export default function MusicDirector() {
  const pathname = usePathname();

  useEffect(() => {
    music.play("menu");
    return listenForPlayback();
  }, [pathname]);

  return null;
}

/**
 * Music for an active round. Pass a track to keep playing (kitchen bed);
 * omit it to silence until the round ends.
 */
export function useRoundMusic(inRound: boolean, track?: MusicTrackId): void {
  useEffect(() => {
    if (inRound) {
      if (track) {
        music.releaseRound();
        music.play(track);
        return () => {
          music.play("menu");
        };
      }
      music.holdForRound();
      // Release on the way out, including when this screen unmounts for the scoreboard.
      return () => {
        music.releaseRound();
        music.play("menu");
      };
    }
    music.releaseRound();
    music.play("menu");
    return listenForPlayback();
  }, [inRound, track]);
}
