"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { BackToShopButton, SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";
import { RECIPE_BY_ID, type RecipeId } from "../content/recipes";
import IngredientChip from "./IngredientChip";

const FLOW = [
  { emoji: "🫓", label: "Roll" },
  { emoji: "🍅", label: "Sauce" },
  { emoji: "🧀", label: "Grate" },
  { emoji: "🍄", label: "Chop" },
  { emoji: "🔥", label: "Bake" },
  { emoji: "🔪", label: "Slice" },
  { emoji: "🛎️", label: "Serve" },
];

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

function Controls({ touch }: { touch: boolean }) {
  const line = { fontSize: "0.88rem", color: N.textSoft, lineHeight: 1.7 } as const;
  if (touch) {
    return (
      <Typography sx={line}>
        Stick to walk · <b>Grab</b> picks up, puts down and adds to a pizza · <b>Chop</b> works a board
      </Typography>
    );
  }
  return (
    <Typography sx={line}>
      <Key>WASD</Key> / <Key>Arrows</Key> walk · <Key>Space</Key> grab · <Key>E</Key> chop · <Key>Shift</Key> dash · <Key>Esc</Key> pause
    </Typography>
  );
}

export default function KitchenMenu({
  levelLabel,
  isDaily,
  menu,
  starTargets,
  touch,
  coins,
  onStart,
  onShop,
  onHelp,
  onClose,
}: {
  levelLabel: string;
  isDaily: boolean;
  menu: readonly RecipeId[];
  starTargets: readonly number[];
  touch: boolean;
  coins: number;
  onStart: () => void;
  onShop: () => void;
  onHelp: () => void;
  onClose: () => void;
}) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 2, display: "grid", placeItems: "center", p: 1.5, bgcolor: "rgba(5,8,13,0.6)", overflowY: "auto" }}>
      <Box sx={{ position: "relative", maxWidth: 520, width: "100%", maxHeight: "94dvh" }}>
      <Panel accent={N.kitchen} padding={2.25} sx={{ maxHeight: "94dvh", overflowY: "auto" }}>
        <Stack spacing={1.5}>
          <Box sx={{ textAlign: "center", px: 4 }}>
            <Typography variant="h2" component="h1" sx={{ color: N.kitchen, textShadow: `0 0 12px ${N.kitchen}66` }}>
              🍕 Lunch Rush
            </Typography>
            <Typography sx={{ color: N.textSoft }}>Greta&apos;s Pizzeria opens at 11:30. Keep the tickets moving!</Typography>
            <Button size="small" variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={onHelp} sx={{ mt: 1 }}>
              How to play
            </Button>
            <Chip label={levelLabel} sx={{ mt: 0.75, bgcolor: N.kitchen, color: N.bg, fontWeight: 700 }} />
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: N.textSoft }}>
              Today&apos;s menu
            </Typography>
            <Stack spacing={0.75}>
              {menu.map((id) => {
                const r = RECIPE_BY_ID[id];
                return (
                  <Stack key={id} direction="row" spacing={1} sx={{ alignItems: "center", p: 0.75, borderRadius: 1.5, bgcolor: N.bgRaise, border: `1px solid ${N.panelEdge}` }}>
                    <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, minWidth: 104, fontSize: "0.95rem" }}>{r.name}</Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                      <IngredientChip id={r.dough} size={26} />
                      {r.sauce && <IngredientChip id={r.sauce} size={26} />}
                      {r.cheese ? <IngredientChip id={r.cheese} size={26} /> : <IngredientChip id="mozzarella" size={26} crossed />}
                      {r.toppings.map((t) => (
                        <IngredientChip key={t} id={t} size={26} />
                      ))}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: N.textSoft }}>
              How to make a pizza
            </Typography>
            <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", rowGap: 0.5 }}>
              {FLOW.map((f, i) => (
                <Stack key={f.label} direction="row" sx={{ alignItems: "center" }}>
                  <Stack sx={{ alignItems: "center", minWidth: 44 }}>
                    <span aria-hidden style={{ fontSize: 22 }}>
                      {f.emoji}
                    </span>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: N.text }}>{f.label}</Typography>
                  </Stack>
                  {i < FLOW.length - 1 && (
                    <Typography aria-hidden sx={{ color: N.textSoft, mx: 0.1 }}>
                      ›
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
            <Typography sx={{ fontSize: "0.82rem", color: N.textSoft, mt: 0.75 }}>
              Carry each ingredient to its station. Grab picks up, puts down, and adds to a pizza. Hold Chop while you stand there to roll, chop, grate, or slice. Tickets tick off what&apos;s on your pizza. Red means no one ordered it. Pull pizzas from the oven in the <b style={{ color: N.brand }}>green</b> for a perfect bake.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
            {starTargets.map((t, i) => (
              <Stack key={i} direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
                {Array.from({ length: i + 1 }).map((_, j) => (
                  <StarRoundedIcon key={j} sx={{ fontSize: 16, color: N.sun }} />
                ))}
                <Typography className="tnum" sx={{ fontSize: "0.85rem", fontWeight: 700, ml: 0.25 }}>
                  {t}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Controls touch={touch} />

          <Stack direction="row" spacing={1}>
            <Button size="large" fullWidth variant="contained" color="success" onClick={onStart} autoFocus>
              Open the kitchen
            </Button>
            <Button size="large" variant="outlined" onClick={onShop} startIcon={<StorefrontRoundedIcon />} sx={{ whiteSpace: "nowrap" }}>
              🪙 {coins}
            </Button>
          </Stack>
          {isDaily && (
            <Typography sx={{ fontSize: "0.8rem", color: N.textSoft, textAlign: "center" }}>
              Daily challenge: everyone gets the full pantry and no upgrades, so the race is fair.
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <SettingsToggles />
          </Box>
        </Stack>
      </Panel>
      <BackToShopButton onClick={onClose} />
      </Box>
    </Box>
  );
}
