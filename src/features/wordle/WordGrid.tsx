"use client";

import Box from "@mui/material/Box";
import { C, RADIUS } from "@/design/tokens";
import type { LetterStatus } from "./scoring";
import type { PuzzleState } from "./useWordleGame";

const TONE: Record<LetterStatus, { bg: string; edge: string; fg: string }> = {
  correct: { bg: C.money, edge: C.moneyDeep, fg: C.white },
  present: { bg: C.sun, edge: C.sunDeep, fg: C.ink },
  absent: { bg: "#AEB8C2", edge: "#8C99A6", fg: C.white },
};

function Tile({ letter, status, filled, delayMs }: { letter: string; status?: LetterStatus; filled: boolean; delayMs: number }) {
  const tone = status ? TONE[status] : filled ? { bg: C.white, edge: C.ink, fg: C.ink } : { bg: C.white, edge: C.sandDeep, fg: C.ink };
  return (
    <Box
      sx={{
        aspectRatio: "1",
        width: "100%",
        display: "grid",
        placeItems: "center",
        borderRadius: `${RADIUS.tile - 6}px`,
        bgcolor: tone.bg,
        color: tone.fg,
        border: `3px solid ${tone.edge}`,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "clamp(1.1rem, 6vw, 1.7rem)",
        textTransform: "uppercase",
        lineHeight: 1,
        boxShadow: status ? `0 3px 0 ${tone.edge}` : "none",
        transition: "background-color 120ms, border-color 120ms",
        ...(status && {
          animation: `tileFlip 380ms ${delayMs}ms cubic-bezier(.2,1.4,.4,1) both`,
          "@keyframes tileFlip": {
            "0%": { transform: "scale(0.65) rotateX(90deg)", opacity: 0 },
            "60%": { transform: "scale(1.08) rotateX(0)" },
            "100%": { transform: "scale(1) rotateX(0)", opacity: 1 },
          },
        }),
      }}
    >
      {letter}
    </Box>
  );
}

/**
 * The classic guess grid for the current puzzle: solved rows show coloured
 * tiles, the active row shows letters as they're typed, and unused rows are
 * empty outlines. Sized purely by CSS so it scales from a small phone to a
 * wide desktop window without any JS measuring.
 */
export default function WordGrid({
  puzzle,
  currentGuess,
  maxGuesses,
  shakeToken,
}: {
  puzzle: PuzzleState;
  currentGuess: string;
  maxGuesses: number;
  shakeToken: number;
}) {
  const length = puzzle.answer.length;
  const activeRow = puzzle.guesses.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", maxWidth: length * 62, mx: "auto" }}>
      {Array.from({ length: maxGuesses }, (_, r) => {
        const committed = r < activeRow;
        const isActive = r === activeRow;
        const letters = committed ? puzzle.guesses[r].split("") : isActive ? currentGuess.split("") : [];
        const statuses = committed ? puzzle.statuses[r] : undefined;
        return (
          <Box
            key={`${r}-${isActive ? shakeToken : "static"}`}
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${length}, 1fr)`,
              gap: 1,
              ...(isActive &&
                shakeToken > 0 && {
                  animation: "rowShake 380ms ease-in-out",
                  "@keyframes rowShake": {
                    "0%,100%": { transform: "translateX(0)" },
                    "20%": { transform: "translateX(-8px)" },
                    "40%": { transform: "translateX(8px)" },
                    "60%": { transform: "translateX(-6px)" },
                    "80%": { transform: "translateX(6px)" },
                  },
                }),
            }}
          >
            {Array.from({ length }, (_, c) => (
              <Tile key={c} letter={letters[c] ?? ""} status={statuses?.[c]} filled={!statuses && !!letters[c]} delayMs={c * 70} />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
