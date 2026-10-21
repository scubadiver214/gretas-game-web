"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";
import { fx } from "@/lib/fx";
import { SHOP_INGREDIENTS, SHOP_UPGRADES, UPGRADE_BY_ID, unlockBlurb, type ShopItem } from "../content/shop";
import { useKitchenProgress } from "../progress";
import { owns, unlockedIngredients } from "../shopRules";

function ShopCard({ item }: { item: ShopItem }) {
  const progress = useKitchenProgress();
  const owned = owns(progress, item);
  const affordable = progress.coins >= item.price;
  const blurb = item.kind === "ingredient" ? unlockBlurb(item.id, unlockedIngredients(progress)) : UPGRADE_BY_ID[item.id].description;
  const buy = () => {
    const r = progress.buy(item);
    if (r.ok) fx.unlocked();
    else fx.bad();
  };
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: "center",
        p: 1,
        borderRadius: 1.5,
        bgcolor: N.bgRaise,
        border: `1px solid ${owned ? `${N.brand}66` : N.panelEdge}`,
      }}
    >
      <Box aria-hidden sx={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, bgcolor: N.panel, flexShrink: 0 }}>
        {item.emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>{item.label}</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: N.textSoft, lineHeight: 1.3 }}>{blurb}</Typography>
      </Box>
      {owned ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: N.brand, px: 1 }}>
          <CheckRoundedIcon fontSize="small" />
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>Owned</Typography>
        </Stack>
      ) : (
        <Button variant="contained" color={affordable ? "success" : "inherit"} disabled={!affordable} onClick={buy} aria-label={`Buy ${item.label} for ${item.price} coins`} sx={{ minWidth: 86 }}>
          🪙 {item.price}
        </Button>
      )}
    </Stack>
  );
}

export default function ShopPanel({ onClose, isDaily }: { onClose: () => void; isDaily: boolean }) {
  const coins = useKitchenProgress((s) => s.coins);
  const [tab, setTab] = useState<"ingredients" | "upgrades">("ingredients");
  const items = tab === "ingredients" ? SHOP_INGREDIENTS : SHOP_UPGRADES;
  return (
    <Box role="dialog" aria-label="Pizzeria shop" sx={{ position: "absolute", inset: 0, zIndex: 5, display: "grid", placeItems: "center", p: 1.5, bgcolor: "rgba(5,8,13,0.75)" }}>
      <Panel accent={N.sun} padding={2} sx={{ maxWidth: 520, width: "100%", maxHeight: "94dvh", display: "flex", flexDirection: "column" }}>
        <Stack spacing={1.25} sx={{ minHeight: 0 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h3" component="h2" sx={{ color: N.sun }}>
              🛒 Pizzeria shop
            </Typography>
            <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontSize: "1.2rem", color: N.sun }} aria-label={`${coins} coins`}>
              🪙 {coins}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.85rem", color: N.textSoft }}>
            Earn coins every shift (score and stars). New ingredients add new pizzas to the menu, and they pay more.
            {isDaily ? " Purchases don't apply to the daily challenge." : ""}
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab value="ingredients" label="Ingredients" />
            <Tab value="upgrades" label="Kitchen upgrades" />
          </Tabs>
          <Stack spacing={0.75} sx={{ overflowY: "auto", maxHeight: "56dvh", pr: 0.5 }}>
            {items.map((item) => (
              <ShopCard key={item.id} item={item} />
            ))}
          </Stack>
          <Button variant="contained" color="success" size="large" onClick={onClose} autoFocus>
            Back to the kitchen
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
