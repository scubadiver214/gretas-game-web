"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import BackspaceRoundedIcon from "@mui/icons-material/BackspaceRounded";
import { C, RADIUS } from "@/design/tokens";
import type { LetterStatus } from "./scoring";
import type { PuzzleState } from "./useWordleGame";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

interface KeyTone {
  bg: string;
  edge: string;
  fg: string;
}

const UNUSED: KeyTone = { bg: C.white, edge: C.sandDeep, fg: C.ink };
const TONE: Record<LetterStatus, KeyTone> = {
  correct: { bg: C.money, edge: C.moneyDeep, fg: C.white },
  present: { bg: C.sun, edge: C.sunDeep, fg: C.ink },
  absent: { bg: "#AEB8C2", edge: "#8C99A6", fg: C.white },
};

/** Best status seen for `letter` across every guess made on this puzzle so far. */
function keyStatus(puzzle: PuzzleState, letter: string): LetterStatus | undefined {
  let best: LetterStatus | undefined;
  for (let r = 0; r < puzzle.guesses.length; r++) {
    const guess = puzzle.guesses[r];
    const statuses = puzzle.statuses[r];
    for (let i = 0; i < guess.length; i++) {
      if (guess[i].toUpperCase() !== letter) continue;
      const st = statuses[i];
      if (st === "correct") return "correct";
      if (st === "present" && best !== "present") best = "present";
      if (st === "absent" && !best) best = "absent";
    }
  }
  return best;
}

function Key({
  label,
  tone,
  wide,
  disabled,
  onClick,
  ariaLabel,
}: {
  label: React.ReactNode;
  tone: KeyTone;
  wide?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      sx={{
        flex: wide ? 1.5 : 1,
        minWidth: 0,
        height: 50,
        borderRadius: `${RADIUS.tile - 6}px`,
        display: "grid",
        placeItems: "center",
        bgcolor: disabled ? C.slate : tone.bg,
        color: disabled ? C.inkSoft : tone.fg,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: wide ? "0.75rem" : "1rem",
        textTransform: "uppercase",
        boxShadow: `0 3px 0 ${disabled ? C.slateDeep : tone.edge}`,
        transition: "transform 80ms ease, box-shadow 80ms ease, background-color 150ms",
        "&:active": { transform: "translateY(3px)", boxShadow: "none" },
      }}
    >
      {label}
    </ButtonBase>
  );
}

/**
 * On-screen QWERTY keyboard. Keys tint to show the best status learned for
 * that letter so far (like the real thing), which helps kids reason about
 * which letters are worth trying again.
 */
export default function Keyboard({
  puzzle,
  onKey,
  onEnter,
  onBackspace,
  disabled = false,
}: {
  puzzle: PuzzleState;
  onKey: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={0.6} sx={{ width: "100%" }}>
      {ROWS.map((row, ri) => (
        <Stack key={row} direction="row" spacing={0.5} sx={{ justifyContent: "center", px: ri === 1 ? "5%" : 0 }}>
          {ri === 2 && (
            <Key label="Enter" wide tone={{ bg: C.blue, edge: C.blueDeep, fg: C.white }} onClick={onEnter} disabled={disabled} ariaLabel="Submit guess" />
          )}
          {row.split("").map((letter) => (
            <Key
              key={letter}
              label={letter}
              tone={keyStatus(puzzle, letter) ? TONE[keyStatus(puzzle, letter)!] : UNUSED}
              onClick={() => onKey(letter)}
              disabled={disabled}
              ariaLabel={`Letter ${letter}`}
            />
          ))}
          {ri === 2 && (
            <Key
              label={<BackspaceRoundedIcon sx={{ fontSize: 20 }} />}
              wide
              tone={{ bg: C.tomato, edge: C.tomatoDeep, fg: C.white }}
              onClick={onBackspace}
              disabled={disabled}
              ariaLabel="Backspace"
            />
          )}
        </Stack>
      ))}
    </Stack>
  );
}
