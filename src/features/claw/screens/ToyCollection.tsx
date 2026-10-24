"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import Panel from "@/components/ui/Panel";
import { CLIP, N } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import type { ClawPrizeEntry } from "../api";
import ClawPageHeader from "../components/ClawPageHeader";
import { RARITY_COLORS } from "../components/rarity";
import { CATEGORY_LABELS, PRIZES, RARITY_LABELS, RARITY_ORDER, type PrizeDef } from "../content/prizes";
import type { Rarity } from "../engine/types";
import { useClawProfile, useSetFavorite } from "../hooks";
import { collectionStats } from "../profileStats";
import { useToyThumbnail } from "../render/thumbnails";

const ToyTurntable = dynamic(() => import("../render/ToyTurntable"), { ssr: false });

type Filter = "all" | "mine" | "favorites" | Rarity;

/** One toy on the shelf. Uncollected toys show as dark silhouettes so the shelf still hints at what is out there. */
function ShelfCard({ prize, entry, onOpen }: { prize: PrizeDef; entry: ClawPrizeEntry | undefined; onOpen: () => void }) {
  const accent = RARITY_COLORS[prize.rarity];
  const url = useToyThumbnail(prize, 144, accent);
  const owned = !!entry;
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={owned ? `${prize.name}, ${RARITY_LABELS[prize.rarity]}, you have ${entry.count}` : `${prize.name}, not found yet`}
      sx={{
        flexDirection: "column",
        alignItems: "stretch",
        p: 1,
        pb: 0,
        clipPath: CLIP.card,
        bgcolor: N.panel,
        border: `1px solid ${owned ? `${accent}80` : N.panelEdge}`,
        boxShadow: owned ? `0 0 16px ${accent}26` : "none",
        textAlign: "center",
        transition: "transform 90ms ease",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{ position: "relative", height: 112, display: "grid", placeItems: "center", background: owned ? `radial-gradient(closest-side, ${accent}2E, transparent)` : undefined }}>
        {url ? (
          <Box
            component="img"
            src={url}
            alt=""
            width={112}
            height={112}
            sx={{ filter: owned ? "none" : "brightness(0) opacity(0.45)", transition: "filter 300ms", animation: owned ? "toyIdle 3s ease-in-out infinite" : undefined, "@keyframes toyIdle": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } } }}
          />
        ) : (
          <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: N.bgRaise }} />
        )}
        {owned && entry.count > 1 && (
          <Chip label={`×${entry.count}`} size="small" sx={{ position: "absolute", top: 4, right: 4, bgcolor: N.sun, color: N.bg, fontWeight: 800, height: 22 }} />
        )}
        {owned && entry.favorite && <StarRoundedIcon sx={{ position: "absolute", top: 4, left: 4, color: N.sun, filter: `drop-shadow(0 0 6px ${N.sun})` }} />}
      </Box>
      <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: owned ? N.text : N.textSoft, lineHeight: 1.15, minHeight: 36 }}>{owned ? prize.name : "???"}</Typography>
      <Typography variant="caption" sx={{ color: accent, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {RARITY_LABELS[prize.rarity]}
      </Typography>
      {/* Shelf plank. */}
      <Box aria-hidden sx={{ mt: 0.75, height: 8, mx: -1, bgcolor: "#8C5A2B", boxShadow: "inset 0 3px 0 #A96E35, 0 3px 0 #5A3518" }} />
    </ButtonBase>
  );
}

function PrizeDialog({ prize, entry, nickname, onClose }: { prize: PrizeDef; entry: ClawPrizeEntry | undefined; nickname: string; onClose: () => void }) {
  const accent = RARITY_COLORS[prize.rarity];
  const favorite = useSetFavorite(nickname);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", backgroundImage: "none" } } }}>
      <Panel accent={accent} padding={2}>
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}>
          <CloseRoundedIcon />
        </IconButton>
        <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
          <Box sx={{ width: "100%", background: `radial-gradient(closest-side, ${accent}33, transparent)` }}>
            {entry ? (
              <ToyTurntable prize={prize} size={220} glow={accent} />
            ) : (
              <Box sx={{ height: 220, display: "grid", placeItems: "center" }}>
                <Typography sx={{ fontSize: 72 }} aria-hidden>
                  ❔
                </Typography>
              </Box>
            )}
          </Box>
          <Typography variant="h3" component="h2">
            {entry ? prize.name : "A mystery toy"}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
            <Chip label={RARITY_LABELS[prize.rarity]} sx={{ bgcolor: accent, color: N.bg, fontWeight: 700 }} />
            <Chip label={CATEGORY_LABELS[prize.category]} variant="outlined" />
            {entry && <Chip label={`You have ${entry.count}`} variant="outlined" />}
          </Stack>
          <Typography sx={{ color: N.textSoft }}>{entry ? prize.description : prize.mysteryOnly ? "Win it from a mystery machine!" : `Look for it from level ${prize.unlockLevel}.`}</Typography>
          {entry && (
            <>
              <Typography variant="caption" sx={{ color: N.textSoft }}>
                First found {new Date(entry.firstCollectedAt).toLocaleDateString()}
              </Typography>
              <Button
                variant={entry.favorite ? "contained" : "outlined"}
                color="warning"
                startIcon={entry.favorite ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                onClick={() => favorite.mutate({ prizeId: prize.id, favorite: !entry.favorite })}
                disabled={favorite.isPending}
              >
                {entry.favorite ? "Favorite!" : "Make it a favorite"}
              </Button>
            </>
          )}
        </Stack>
      </Panel>
    </Dialog>
  );
}

function Inner() {
  const nickname = usePlayerStore((s) => s.nickname);
  const { profile } = useClawProfile(nickname);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const stats = collectionStats(profile);
  const byId = useMemo(() => new Map(profile.prizes.map((p) => [p.prizeId, p])), [profile.prizes]);

  const shown = useMemo(() => {
    const list = PRIZES.filter((p) => {
      const entry = byId.get(p.id);
      if (filter === "mine") return !!entry;
      if (filter === "favorites") return !!entry?.favorite;
      if (filter === "all") return true;
      return p.rarity === filter;
    });
    // Owned first, then by rarity (rarest first), then catalog order.
    return [...list].sort((a, b) => Number(!!byId.get(b.id)) - Number(!!byId.get(a.id)) || RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);
  }, [filter, byId]);

  const treasures = PRIZES.filter((p) => (p.rarity === "rare" || p.rarity === "legendary") && byId.has(p.id));
  const openPrize = open ? PRIZES.find((p) => p.id === open) : undefined;

  return (
    <PageContainer maxWidth={900}>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <ClawPageHeader
          title="My Toy Collection"
          subtitle={stats.unique === 0 ? "Win toys from the claw machines and they will land on these shelves." : `${stats.unique} of ${stats.catalog} different toys found · ${stats.percent}% complete`}
          right={
            <>
              <span aria-hidden>🧸</span>
              <span className="tnum">{stats.total}</span>
            </>
          }
        />

        {/* Completion bar. */}
        <Box role="progressbar" aria-label="Collection complete" aria-valuenow={stats.percent} aria-valuemin={0} aria-valuemax={100} sx={{ height: 14, borderRadius: 999, bgcolor: N.bgRaise, border: `1px solid ${N.panelEdge}`, overflow: "hidden" }}>
          <Box sx={{ width: `${stats.percent}%`, height: "100%", bgcolor: N.claw, boxShadow: `0 0 10px ${N.claw}99`, transition: "width 600ms ease" }} />
        </Box>

        {treasures.length > 0 && (
          <Panel accent={N.sun} padding={1.5}>
            <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.sun, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              Treasure shelf
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {treasures.map((p) => (
                <Chip key={p.id} label={p.name} onClick={() => setOpen(p.id)} sx={{ bgcolor: `${RARITY_COLORS[p.rarity]}26`, border: `1px solid ${RARITY_COLORS[p.rarity]}`, color: N.text, fontWeight: 700 }} />
              ))}
            </Stack>
          </Panel>
        )}

        <Tabs value={filter} onChange={(_, v: Filter) => setFilter(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: `1px solid ${N.panelEdge}` }}>
          <Tab value="all" label={`All ${PRIZES.length}`} />
          <Tab value="mine" label={`Mine ${stats.unique}`} />
          <Tab value="favorites" label={`Favorites ${stats.favorites}`} />
          {(["common", "uncommon", "rare", "legendary"] as const).map((r) => (
            <Tab key={r} value={r} label={RARITY_LABELS[r]} sx={{ color: RARITY_COLORS[r] }} />
          ))}
        </Tabs>

        {shown.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 56 }} aria-hidden>
              🧸
            </Typography>
            <Typography variant="h4">Nothing here yet</Typography>
            <Typography sx={{ color: N.textSoft }}>Play the claw machines to fill this shelf.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(136px, 1fr))", gap: 1.5 }}>
            {shown.map((p) => (
              <ShelfCard key={p.id} prize={p} entry={byId.get(p.id)} onOpen={() => setOpen(p.id)} />
            ))}
          </Box>
        )}
      </Stack>
      {openPrize && <PrizeDialog prize={openPrize} entry={byId.get(openPrize.id)} nickname={nickname} onClose={() => setOpen(null)} />}
    </PageContainer>
  );
}

export default function ToyCollection() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
