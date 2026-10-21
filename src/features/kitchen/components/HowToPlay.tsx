"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";

function Key({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: "inline-block",
        minWidth: 22,
        px: 0.6,
        mx: 0.2,
        borderRadius: 1,
        border: `1px solid ${N.panelEdge}`,
        borderBottomWidth: 3,
        bgcolor: N.bgRaise,
        fontFamily: "var(--font-display)",
        fontSize: "0.78rem",
        fontWeight: 800,
        textAlign: "center",
        color: N.text,
      }}
    >
      {children}
    </Box>
  );
}

const STEPS = [
  "Walk to a crate and press Grab to pick up the ingredient on the ticket.",
  "Dough goes on a dough table. Put it down, then hold Chop until it rolls into a crust.",
  "Cheese and most toppings go on a chopping board. Put them down, then hold Chop. Sauce, basil, and olives are ready, so skip the board.",
  "Carry each ready ingredient to the pizza and press Grab to add it. The ticket checks off what you added. Red means nobody ordered that piece.",
  "Carry the pizza to an oven and press Grab. Take it out with Grab while the bar is green. Too early is raw. Too late burns, and a burnt pizza cannot be served.",
  "Put the baked pizza on the slicer and hold Chop to cut it.",
  "Pick it up, walk to the serving window, and press Grab to hand it over.",
];

function Controls({ touch }: { touch: boolean }) {
  const line = { fontSize: "0.9rem", color: N.text, lineHeight: 1.7 } as const;
  if (touch) {
    return (
      <Typography sx={line}>
        The stick walks. <b>Grab</b> picks up, puts down, tops a pizza, and serves. <b>Chop</b> rolls, chops, grates, and slices — hold it while you stand still at that station.
      </Typography>
    );
  }
  return (
    <Typography sx={line}>
      <Key>Arrows</Key> or <Key>WASD</Key> walk · <Key>Space</Key> grab · <Key>E</Key> work · <Key>Shift</Key> dash · <Key>Esc</Key> pause
    </Typography>
  );
}

export default function HowToPlay({
  touch,
  captureEscape,
  onClose,
}: {
  touch: boolean;
  /** Menu has no game keyboard, so this card listens for Esc itself. */
  captureEscape: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!captureEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureEscape, onClose]);

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitchen-howto-title"
      sx={{ position: "absolute", inset: 0, zIndex: 8, display: "grid", placeItems: "center", p: 1.5, bgcolor: "rgba(5,8,13,0.78)", overflowY: "auto" }}
    >
      <Panel accent={N.kitchen} padding={2.25} sx={{ maxWidth: 520, width: "100%", maxHeight: "94dvh", overflowY: "auto" }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography id="kitchen-howto-title" variant="h2" component="h2" sx={{ color: N.kitchen }}>
              How to play
            </Typography>
            <Typography sx={{ color: N.textSoft, mt: 0.5 }}>
              Fill each ticket before the customer leaves. Match every ingredient, bake it, slice it, and serve it. Correct pizzas in a row raise your combo. Hit the star scores before closing time.
            </Typography>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: N.textSoft }}>
              Make one pizza
            </Typography>
            <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 2.25 }}>
              {STEPS.map((step) => (
                <Typography key={step} component="li" sx={{ fontSize: "0.92rem", color: N.text, lineHeight: 1.45 }}>
                  {step}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Typography sx={{ fontSize: "0.9rem", color: N.textSoft }}>
            Grab is one button for pick up, put down, add a topping, and serve. Work only happens when you stand still at a dough table, chopping board, or slicer. Mistakes go in the bin: carry them over and press Grab.
          </Typography>

          <Box>
            <Typography variant="overline" sx={{ color: N.textSoft }}>
              Controls
            </Typography>
            <Controls touch={touch} />
          </Box>

          <Button size="large" variant="contained" color="success" onClick={onClose} autoFocus>
            Got it
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
