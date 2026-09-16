"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PedalBikeRoundedIcon from "@mui/icons-material/PedalBikeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import Tooltip from "@mui/material/Tooltip";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { C, RADIUS, hardShadow, pressedShadow } from "@/design/tokens";
import { ACHIEVEMENT_BY_ID } from "@/features/player/achievements";
import { isBikeSkinUnlocked, usePlayerStore } from "@/features/player/store";
import { BIKE_SKINS, CHARACTER_LABELS, DEFAULT_COLOR, PLAYER_COLORS, type BikeSkinId, type CharacterId } from "@/features/player/types";
import { fx } from "@/lib/fx";

const CharacterPreview = dynamic(() => import("./CharacterPreview"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" width="100%" height="100%" />,
});

const OPTIONS: { id: CharacterId; tagline: string; fill: string; edge: string }[] = [
  { id: "girl", tagline: "Loves extra cheese", fill: C.tomato, edge: C.tomatoDeep },
  { id: "boy", tagline: "Fastest bike in town", fill: C.blue, edge: C.blueDeep },
];

/** Section label styled like a little shop sign. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        textAlign: "center",
        mb: 1,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: "1.05rem",
        color: C.ink,
      }}
    >
      {children}
    </Typography>
  );
}

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const saved = usePlayerStore((s) => s.character);
  const savedColor = usePlayerStore((s) => s.color);
  const setCharacter = usePlayerStore((s) => s.setCharacter);
  const setColor = usePlayerStore((s) => s.setColor);
  const bikeSkin = usePlayerStore((s) => s.bikeSkin);
  const setBikeSkin = usePlayerStore((s) => s.setBikeSkin);
  const achievements = usePlayerStore((s) => s.achievements);
  const [pickedSkin, setPickedSkin] = useState<BikeSkinId>(bikeSkin);
  const [selected, setSelected] = useState<CharacterId | null>(saved);
  // null = "use the character's default colour" until the player picks one.
  const [pickedColor, setPickedColor] = useState<string | null>(
    saved && savedColor !== DEFAULT_COLOR[saved] ? savedColor : null,
  );
  const previewColor = (id: CharacterId) => pickedColor ?? DEFAULT_COLOR[id];

  return (
    <PageContainer>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              color: C.white,
              WebkitTextStroke: `8px ${C.blueDeep}`,
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 4px 0 rgba(22,33,46,0.16))",
            }}
          >
            Hi {nickname}!
          </Typography>
          <Typography sx={{ color: C.ink, fontWeight: 700 }}>Who is on shift today?</Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flex: 1 }}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <ButtonBase
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                aria-pressed={active}
                aria-label={`Play as ${CHARACTER_LABELS[opt.id]}`}
                sx={{
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "stretch",
                  borderRadius: `${RADIUS.panel}px`,
                  overflow: "hidden",
                  bgcolor: C.white,
                  boxShadow: hardShadow(active ? opt.edge : C.sandDeep, 7),
                  outline: active ? `5px solid ${opt.fill}` : "5px solid transparent",
                  outlineOffset: -1,
                  transform: active ? "translateY(-3px)" : "none",
                  transition: "transform 150ms ease, outline-color 150ms ease, box-shadow 150ms ease",
                  "&:active": { transform: "translateY(4px)", boxShadow: pressedShadow(opt.edge) },
                }}
              >
                <Box sx={{ position: "relative", flex: 1, minHeight: 210, bgcolor: active ? C.sandSoft : "#F1F4F8" }}>
                  <CharacterPreview character={opt.id} active={active} color={previewColor(opt.id)} />
                  {active && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        bgcolor: C.money,
                        display: "grid",
                        placeItems: "center",
                        boxShadow: `0 3px 0 ${C.moneyDeep}`,
                      }}
                    >
                      <CheckRoundedIcon sx={{ color: C.white, fontSize: 22 }} />
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: 1.5, textAlign: "center", bgcolor: active ? opt.fill : C.white, color: active ? C.white : C.ink }}>
                  <Typography variant="h4">{CHARACTER_LABELS[opt.id]}</Typography>
                  <Typography variant="body2" sx={{ opacity: active ? 0.95 : 0.7 }}>
                    {opt.tagline}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Stack>

        <Box>
          <SectionLabel>🎨 Pick your colour</SectionLabel>
          <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }} role="radiogroup" aria-label="Outfit colour">
            {PLAYER_COLORS.map((c) => {
              const current = selected ? previewColor(selected) : pickedColor;
              const on = current === c.id;
              return (
                <ButtonBase
                  key={c.id}
                  role="radio"
                  aria-checked={on}
                  aria-label={c.label}
                  onClick={() => setPickedColor(c.id)}
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    bgcolor: c.id,
                    border: "4px solid #fff",
                    boxShadow: on ? `0 0 0 4px ${c.id}, 0 4px 0 rgba(22,33,46,0.18)` : "0 3px 0 rgba(22,33,46,0.18)",
                    transform: on ? "translateY(-2px)" : "none",
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    "&:active": { transform: "translateY(3px)" },
                  }}
                >
                  {on && <CheckRoundedIcon sx={{ color: "#fff", fontSize: 24 }} />}
                </ButtonBase>
              );
            })}
          </Stack>
        </Box>

        <Box>
          <SectionLabel>
            <PedalBikeRoundedIcon sx={{ fontSize: 20, verticalAlign: "-4px", mr: 0.5 }} />
            Pick your bike
          </SectionLabel>
          <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }} role="radiogroup" aria-label="Bike paint">
            {BIKE_SKINS.map((s) => {
              const unlocked = isBikeSkinUnlocked(s.id, achievements);
              const on = pickedSkin === s.id;
              const req = s.unlockedBy ? ACHIEVEMENT_BY_ID[s.unlockedBy] : undefined;
              const tip = unlocked ? s.label : `${s.label} · unlock with "${req?.title}": ${req?.description}`;
              return (
                <Tooltip key={s.id} title={tip} enterTouchDelay={0}>
                  <ButtonBase
                    role="radio"
                    aria-checked={on}
                    aria-label={tip}
                    onClick={() => {
                      if (!unlocked) {
                        fx.bad();
                        return;
                      }
                      fx.bell();
                      setPickedSkin(s.id);
                    }}
                    sx={{
                      px: 1.5,
                      height: 42,
                      borderRadius: 999,
                      gap: 0.5,
                      bgcolor: unlocked ? s.frame : C.slate,
                      color: unlocked ? "#fff" : C.inkSoft,
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      border: "3px solid #fff",
                      boxShadow: on ? `0 0 0 4px ${s.frame}, 0 4px 0 rgba(22,33,46,0.18)` : "0 3px 0 rgba(22,33,46,0.18)",
                      transform: on ? "translateY(-2px)" : "none",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                      "&:active": { transform: "translateY(3px)" },
                    }}
                  >
                    {unlocked ? on ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : null : <LockRoundedIcon sx={{ fontSize: 16 }} />}
                    {s.label}
                  </ButtonBase>
                </Tooltip>
              );
            })}
          </Stack>
        </Box>

        <Stack spacing={0.5}>
          <Button
            size="large"
            variant="contained"
            color="success"
            disabled={!selected}
            startIcon={<PlayArrowRoundedIcon />}
            onClick={() => {
              if (!selected) return;
              setCharacter(selected);
              setColor(previewColor(selected));
              setBikeSkin(pickedSkin);
              router.push("/adventure");
            }}
          >
            {selected ? `Play as ${CHARACTER_LABELS[selected]}` : "Pick a character"}
          </Button>
          <Button variant="text" onClick={() => router.push("/")}>
            Change name
          </Button>
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function CharacterSelect() {
  return (
    <RequirePlayer needCharacter={false}>
      <Inner />
    </RequirePlayer>
  );
}
