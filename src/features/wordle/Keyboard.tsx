"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import BackspaceRoundedIcon from "@mui/icons-material/BackspaceRounded";
import { N } from "@/design/neon";
import type { LetterStatus } from "./scoring";
import type { PuzzleState } from "./useWordleGame";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

interface KeyTone {
  bg: string;
  edge: string;
  fg: string;
}

const UNUSED: KeyTone = { bg: N.bgRaise, edge: N.panelEdge, fg: N.text };
const TONE: Record<LetterStatus, KeyTone> = {
  correct: { bg: N.brand, edge: N.brandDeep, fg: N.bg },
  present: { bg: N.sun, edge: N.sunDeep, fg: N.bg },
  absent: { bg: N.panelEdge, edge: N.bgRaise, fg: N.textSoft },
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
        borderRadius: "14px",
        display: "grid",
        placeItems: "center",
        bgcolor: disabled ? N.panel : tone.bg,
        color: disabled ? N.textSoft : tone.fg,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: wide ? "0.75rem" : "1rem",
        textTransform: "uppercase",
        border: `1px solid ${disabled ? N.panelEdge : tone.edge}`,
        transition: "transform 80ms ease, background-color 150ms",
        "&:active": { transform: "translateY(3px)" },
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
            <Key label="Enter" wide tone={{ bg: N.brand, edge: N.brandDeep, fg: N.bg }} onClick={onEnter} disabled={disabled} ariaLabel="Submit guess" />
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
              tone={{ bg: N.kitchen, edge: N.kitchenDeep, fg: N.bg }}
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
