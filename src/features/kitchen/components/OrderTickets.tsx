"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import { N } from "@/design/neon";
import type { IngredientId } from "../content/ingredients";
import { bestOrderFor, components, isCompatible, matchesExactly } from "../engine/pizza";
import type { HudOrder, HudPizza } from "../engine/types";
import IngredientChip, { type ChipState } from "./IngredientChip";

function patienceColor(p: number): string {
  return p > 0.5 ? N.brand : p > 0.25 ? N.sun : N.kitchen;
}

function Ticket({ order, focus, closest, compact, strip }: { order: HudOrder; focus: HudPizza | null; closest: boolean; compact: boolean; strip: boolean }) {
  const onPizza = focus ? new Set(components(focus)) : null;
  const onTrack = !!focus && isCompatible(focus, order);
  const exact = !!focus && matchesExactly(focus, order);
  const extras: IngredientId[] = focus && closest && !onTrack ? components(focus).filter((i) => !components(order).includes(i)) : [];
  const state = (id: IngredientId): ChipState => (onPizza?.has(id) ? "done" : "todo");
  const size = strip ? 20 : compact ? 24 : 30;
  const urgent = order.patience <= 0.25;
  const accent = exact ? N.brand : onTrack ? N.delivery : extras.length ? N.kitchen : order.rush ? N.sun : N.panelEdge;

  return (
    <Box
      role="listitem"
      aria-label={`${order.name}${order.rush ? ", rush order" : ""}`}
      sx={{
        position: "relative",
        flexShrink: 0,
        width: strip ? 112 : compact ? 124 : 158,
        bgcolor: "#FFFDF7",
        color: "#1B1F2A",
        borderRadius: "6px 6px 10px 10px",
        border: `3px solid ${accent}`,
        boxShadow: exact || onTrack ? `0 0 16px ${accent}AA` : "0 6px 16px rgba(0,0,0,0.45)",
        overflow: "hidden",
        transformOrigin: "top center",
        animation: `ticketIn 380ms cubic-bezier(.2,1.4,.4,1)${urgent ? ", ticketShake 500ms ease-in-out infinite" : ""}`,
        "@keyframes ticketIn": { from: { transform: "translateY(-40px) rotate(-6deg)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
        "@keyframes ticketShake": { "0%,100%": { transform: "rotate(-1.5deg)" }, "50%": { transform: "rotate(1.5deg)" } },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", px: strip ? 0.5 : 0.75, pt: strip ? 0.25 : 0.5 }}>
        {order.rush && <BoltRoundedIcon aria-hidden sx={{ fontSize: 16, color: N.sunDeep }} />}
        <Typography
          sx={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: strip ? "0.68rem" : compact ? "0.78rem" : "0.9rem",
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {order.name}
        </Typography>
      </Stack>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: strip ? 0.375 : 0.5, px: strip ? 0.5 : 0.75, py: strip ? 0.25 : 0.6, maxWidth: strip ? 104 : undefined }}>
        <IngredientChip id={order.dough} state={state(order.dough)} size={size} />
        {order.sauce && <IngredientChip id={order.sauce} state={state(order.sauce)} size={size} />}
        {order.cheese ? <IngredientChip id={order.cheese} state={state(order.cheese)} size={size} /> : <IngredientChip id="mozzarella" size={size} crossed />}
        {order.toppings.map((t) => (
          <IngredientChip key={t} id={t} state={state(t)} size={size} />
        ))}
        {extras.map((t) => (
          <IngredientChip key={`x-${t}`} id={t} state="extra" size={size} />
        ))}
      </Box>
      <Box sx={{ height: strip ? 4 : 7, bgcolor: "#E7E0D2" }}>
        <Box
          role="progressbar"
          aria-label="Customer patience"
          aria-valuenow={Math.round(order.patience * 100)}
          sx={{ height: "100%", width: `${order.patience * 100}%`, bgcolor: patienceColor(order.patience), transition: "width 200ms linear, background-color 300ms" }}
        />
      </Box>
    </Box>
  );
}

/**
 * Orders across the top of the screen.
 * `strip` is the short landscape-phone rail: two rows of icons, so the back
 * counter (the ingredient crates) can sit below it.
 */
export default function OrderTickets({ orders, focus, compact = false, strip = false }: { orders: HudOrder[]; focus: HudPizza | null; compact?: boolean; strip?: boolean }) {
  const closest = focus ? bestOrderFor(focus, orders.map((o) => ({ ...o, patience: o.patience }))) : null;
  return (
    <Stack
      role="list"
      aria-label="Orders"
      direction="row"
      spacing={0.75}
      sx={{ overflowX: "auto", pb: strip ? 0 : 0.5, alignItems: "flex-start", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
    >
      {orders.map((o) => (
        <Ticket key={o.id} order={o} focus={focus} closest={closest?.id === o.id} compact={compact} strip={strip} />
      ))}
      {orders.length === 0 && (
        <Typography sx={{ color: N.textSoft, fontFamily: "var(--font-display)", fontWeight: 700, py: 1 }}>Waiting for customers…</Typography>
      )}
    </Stack>
  );
}
