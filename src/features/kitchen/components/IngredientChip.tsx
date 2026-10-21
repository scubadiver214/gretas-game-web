import Box from "@mui/material/Box";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { N } from "@/design/neon";
import { INGREDIENT_BY_ID, type IngredientId } from "../content/ingredients";

export type ChipState = "todo" | "done" | "extra";

/** Round ingredient icon; ticks green when it's on the pizza, red when it shouldn't be. */
export default function IngredientChip({ id, state = "todo", size = 30, crossed = false }: { id: IngredientId; state?: ChipState; size?: number; crossed?: boolean }) {
  const def = INGREDIENT_BY_ID[id];
  const ring = state === "done" ? N.brand : state === "extra" ? N.kitchen : `${def.color}`;
  return (
    <Box
      title={crossed ? `No ${def.label}` : def.label}
      aria-label={`${crossed ? "No " : ""}${def.label}${state === "done" ? " (on the pizza)" : state === "extra" ? " (not on this order)" : ""}`}
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.58,
        lineHeight: 1,
        bgcolor: state === "extra" ? `${N.kitchen}33` : N.bgRaise,
        border: `2px solid ${ring}`,
        opacity: state === "done" ? 0.75 : 1,
        filter: crossed ? "grayscale(0.6)" : undefined,
      }}
    >
      <span aria-hidden>{def.emoji}</span>
      {crossed && (
        <Box aria-hidden sx={{ position: "absolute", width: "110%", height: 3, bgcolor: N.kitchen, transform: "rotate(-40deg)", borderRadius: 2 }} />
      )}
      {state !== "todo" && size >= 24 && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: -5,
            bottom: -5,
            width: 16,
            height: 16,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: state === "done" ? N.brandDeep : N.kitchenDeep,
            border: `2px solid ${N.bg}`,
          }}
        >
          {state === "done" ? <CheckRoundedIcon sx={{ fontSize: 11, color: N.white }} /> : <CloseRoundedIcon sx={{ fontSize: 11, color: N.white }} />}
        </Box>
      )}
    </Box>
  );
}
