"use client";

import { usePendingRouter } from "@/components/PendingNavigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import NeonPage from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { SettingsToggles } from "@/components/HUD";
import { CLIP, N, neonGlow, panelGlow, textGlow } from "@/design/neon";
import AvatarBadge from "@/features/claw/components/AvatarBadge";
import { GAME_TITLE as CLAW_TITLE } from "@/features/claw/config";
import { GAME_TITLE as RACING_TITLE } from "@/features/racing/config";
import { GAME_TITLE as HUNTING_TITLE } from "@/features/hunting/config";
import { useClawProfile } from "@/features/claw/hooks";
import { usePlayerStore } from "@/features/player/store";
import { usePersonalBests } from "@/features/scores/hooks";
import { ACHIEVEMENTS } from "@/features/player/achievements";
import { LEVEL_NAMES, STARS_PER_LEVEL, dailyStreak, levelForStars } from "@/features/player/progress";
import { MODE_LABELS, MODE_SHORT_LABELS, type GameMode } from "@/features/player/types";
import { dailyKey } from "@/lib/rng";

const ADVENTURES: {
  mode?: GameMode;
  title: string;
  blurb: string;
  emoji: string;
  accent: string;
  /** Full-bleed neon portrait. Required. Same crop as Bea's Claw tile. */
  art: { src: string; alt: string };
  /** Arcade games always start at level 1, so the card shows no star level. */
  arcade?: boolean;
  /** Where the card goes; defaults to /play/<mode>. */
  to?: string;
  /** Status chip override for the card. */
  status?: string;
  /** Leave the game out of the daily-challenge strip. */
  daily?: boolean;
}[] = [
  {
    mode: "kitchen",
    title: "Make pizzas",
    blurb: "Top it, bake it, serve it",
    emoji: "🍕",
    accent: N.kitchen,
    art: { src: "/characters/greta-neon.jpg", alt: "Greta dashing with a glowing pizza box" },
  },
  {
    mode: "delivery",
    title: "Deliver pizzas",
    blurb: "Ride fast, dodge cones",
    emoji: "🛵",
    accent: N.delivery,
    art: { src: "/characters/max-neon.jpg", alt: "Max popping a wheelie on his neon scooter" },
  },
  {
    mode: "wordle",
    title: "Guess the word",
    blurb: "Crack it before you run out of tries",
    emoji: "🔤",
    accent: N.wordle,
    art: { src: "/characters/wordle-owl.jpg", alt: "A glowing purple owl perched on a letter cube" },
  },
  {
    mode: "frogger",
    title: "Frogger Adventure",
    blurb: "Dodge cars, ride logs",
    emoji: "🐸",
    accent: N.frogger,
    art: { src: "/characters/frogger-neon.jpg", alt: "A happy green frog leaping over a glowing river" },
    arcade: true,
  },
  {
    mode: "claw",
    title: CLAW_TITLE,
    blurb: "Grab toys, collect avatars",
    emoji: "🧸",
    accent: N.claw,
    art: { src: "/characters/claw-neon.jpg", alt: "A girl reaching for a teddy in a glowing claw machine" },
    arcade: true,
    to: "/claw",
    status: "Arcade · 50 levels",
    daily: false,
  },
  {
    mode: "racing",
    title: RACING_TITLE,
    blurb: "Race the desert, snow, mountains, beach and jungle",
    emoji: "🏎️",
    art: { src: "/characters/racing-fitzmagic-neon.jpg", alt: "A kid in a blue helmet launching a pearl-white and black Fitzmagic hypercar off a ramp through a glowing neon arch, snowy and green mountains behind" },
    accent: N.racing,
    arcade: true,
    to: "/play/racing",
    status: "5 tracks · New!",
    daily: false,
  },
  {
    mode: "hunting",
    title: HUNTING_TITLE,
    blurb: "Duck hunts and wildlife photos at a mountain lake",
    emoji: "🦆",
    art: { src: "/characters/hunting-quack-neon.jpg", alt: "A cheerful mallard flying over a glowing mountain lake" },
    accent: N.hunting,
    arcade: true,
    to: "/play/hunting",
    status: "Lakeside · New!",
    daily: false,
  },
  {
    title: "Shelby's Scoops!",
    blurb: "Build cones, invent recipes",
    emoji: "🍦",
    accent: N.scoops,
    art: { src: "/characters/scoops-sister-neon.jpg", alt: "A girl with brown braids and a blue hoodie reaching for a glowing triple-scoop cone" },
    arcade: true,
    to: "/play/scoops",
    status: "Shop · New!",
    daily: false,
  },
];

const DAILY_ADVENTURES = ADVENTURES.filter((a): a is typeof a & { mode: GameMode } => a.daily !== false && a.mode !== undefined);

/** Star pips showing progress inside the current level. */
function StarPips({ stars }: { stars: number }) {
  const inLevel = levelForStars(stars) >= 5 ? STARS_PER_LEVEL : stars % STARS_PER_LEVEL;
  return (
    <Stack direction="row" spacing={0.25} aria-label={`${inLevel} of ${STARS_PER_LEVEL} stars to the next level`}>
      {Array.from({ length: STARS_PER_LEVEL }).map((_, i) => (
        <StarRoundedIcon
          key={i}
          sx={{
            fontSize: 18,
            color: i < inLevel ? N.sun : "rgba(147,165,190,0.25)",
            filter: i < inLevel ? `drop-shadow(0 0 6px ${N.sun}99)` : undefined,
          }}
        />
      ))}
    </Stack>
  );
}

/** Small dark stat chip used inside the game cards. */
function StatChip({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        height: 26,
        clipPath: CLIP.button,
        bgcolor: N.bgRaise,
        border: `1px solid ${accent}59`,
        color: N.text,
        fontFamily: "var(--font-arcade)",
        fontWeight: 600,
        fontSize: "0.8rem",
      }}
    >
      {children}
    </Box>
  );
}

/** Floating dark pill for the header bar. */
const pillSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  height: 46,
  px: 1.25,
  clipPath: CLIP.button,
  bgcolor: N.panel,
  border: `1px solid ${N.panelEdge}`,
} as const;

function Inner() {
  const { push } = usePendingRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const stars = usePlayerStore((s) => s.stars);
  const history = usePlayerStore((s) => s.history);
  const achievements = usePlayerStore((s) => s.achievements);
  const bests = usePersonalBests(nickname);
  const bestFor = (mode: GameMode) => bests.data?.find((b) => b.mode === mode)?.score;
  const { profile: claw } = useClawProfile(nickname);

  const today = dailyKey();
  const dailyDone = (mode: GameMode) => history.some((h) => h.challengeDate === today && h.mode === mode);
  const streak = dailyStreak(
    history.map((h) => h.challengeDate),
    today,
  );
  const trophyCount = Object.keys(achievements).length;
  const totalStars = (stars.kitchen ?? 0) + (stars.delivery ?? 0);

  return (
    <NeonPage maxWidth={1080}>
      <Stack spacing={{ xs: 1.75, md: 2.5 }} sx={{ flex: 1, py: { xs: 1.5, md: 3 } }}>
        {/* Player bar: name badge on the left, stars + settings on the right. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ButtonBase onClick={() => push("/character")} sx={{ ...pillSx, pl: 0.5, pr: 1.5, cursor: "pointer" }}>
            <AvatarBadge avatarId={claw.selectedAvatar} nickname={nickname} character={character} color={color} size={34} />
            <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1rem", color: N.text }}>
              {nickname}
            </Typography>
          </ButtonBase>
          <Box sx={{ flex: 1 }} />
          <Box sx={pillSx}>
            <StarRoundedIcon sx={{ color: N.sun, fontSize: 24, filter: `drop-shadow(0 0 6px ${N.sun}99)` }} />
            <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1.15rem", color: N.text }}>
              {totalStars}
            </Typography>
          </Box>
          <SettingsToggles size="small" />
        </Stack>

        <Typography
          component="h1"
          sx={{
            textAlign: "center",
            fontFamily: "var(--font-arcade)",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 7vw, 2.1rem)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: N.brand,
            textShadow: textGlow(N.brand),
          }}
        >
          Pick your game!
        </Typography>

        {/* Game cards: stacked rows with art on the right on phones, portrait cards with art on top from md up. */}
          <Box
          sx={{
            flex: { xs: 1, md: "none" },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" },
            gridAutoRows: { xs: "minmax(116px, 1fr)", md: "auto" },
            gap: { xs: 1.25, md: 2 },
          }}
        >
          {ADVENTURES.map(({ mode, title, blurb, accent, art, arcade, to, status }) => {
            const modeStars = mode ? (stars[mode] ?? 0) : 0;
            const level = levelForStars(modeStars);
            const best = mode ? bestFor(mode) : undefined;
            const chip = status ?? (arcade || !mode ? "Arcade · 3 lives" : `Lv ${level} · ${LEVEL_NAMES[level]}`);
            return (
              <ButtonBase
                key={mode ?? title}
                onClick={() => push(to ?? (mode ? `/play/${mode}` : "/adventure"))}
                aria-label={`Play ${title}`}
                sx={{
                  textAlign: "left",
                  display: "flex",
                  flexDirection: { xs: "row", md: "column" },
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                  maxHeight: { xs: 220, md: "none" },
                  clipPath: CLIP.card,
                  bgcolor: N.panel,
                  border: `1px solid ${accent}59`,
                  boxShadow: panelGlow(accent),
                  overflow: "hidden",
                  transition: "transform 90ms ease, box-shadow 120ms ease",
                  "&:hover": { boxShadow: neonGlow(accent) },
                  "&:active": { transform: "translateY(3px)" },
                }}
              >
                {/* Accent spine: left edge on phones, top edge on portrait cards. */}
                <Box
                  aria-hidden
                  sx={{
                    width: { xs: 5, md: "100%" },
                    height: { xs: "auto", md: 5 },
                    order: { md: -2 },
                    flexShrink: 0,
                    bgcolor: accent,
                    boxShadow: `0 0 14px ${accent}`,
                  }}
                />
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    p: { xs: 1.75, md: 2.25 },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: { xs: "center", md: "flex-start" },
                  }}
                >
                  <Typography
                    component="h2"
                    sx={{
                      fontFamily: "var(--font-arcade)",
                      fontWeight: 700,
                      fontSize: "1.3rem",
                      lineHeight: 1.15,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      color: accent,
                      textShadow: `0 0 10px ${accent}66`,
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography sx={{ color: N.textSoft, fontSize: "0.9rem", mb: 1 }}>{blurb}</Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                    <StatChip accent={accent}>{chip}</StatChip>
                    {mode === "claw" && claw.currentLevel > 1 && <StatChip accent={accent}>Level {claw.currentLevel}</StatChip>}
                    {best !== undefined && (
                      <StatChip accent={accent}>
                        <EmojiEventsRoundedIcon sx={{ fontSize: 15, color: N.sun }} /> {best}
                      </StatChip>
                    )}
                    {mode && !arcade && <StarPips stars={modeStars} />}
                  </Stack>
                </Box>
                {/* Art column: full-bleed portrait, same crop on every card. */}
                <Box
                  aria-hidden
                  sx={{
                    position: "relative",
                    width: { xs: 104, md: "100%" },
                    height: { md: "clamp(220px, 40vh, 420px)" },
                    order: { md: -1 },
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Image
                    src={art.src}
                    alt=""
                    fill
                    sizes="(min-width: 900px) 340px, 104px"
                    style={{ objectFit: "cover", objectPosition: "center 22%" }}
                  />
                  {/* Fade the art into the panel so it never fights the text. */}
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: {
                        xs: `linear-gradient(90deg, ${N.panel}, transparent 45%)`,
                        md: `linear-gradient(0deg, ${N.panel}, transparent 40%)`,
                      },
                    }}
                  />
                </Box>
              </ButtonBase>
            );
          })}
        </Box>

        {/* Daily challenge beside the nav on wide screens, stacked on phones. */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: { xs: 1.75, md: 2.5 } }}>
          <Box
            sx={{
              clipPath: CLIP.card,
              bgcolor: N.panel,
              border: `1px solid ${N.sun}40`,
              boxShadow: panelGlow(N.sun),
              p: 2,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <Typography
                component="h2"
                sx={{
                  flex: 1,
                  fontFamily: "var(--font-arcade)",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: N.sun,
                  textShadow: `0 0 10px ${N.sun}66`,
                }}
              >
                📅 Today&apos;s challenge
              </Typography>
              {streak > 0 && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                    px: 1,
                    height: 28,
                    clipPath: CLIP.button,
                    bgcolor: N.kitchen,
                    color: N.white,
                    fontFamily: "var(--font-arcade)",
                    fontWeight: 700,
                    boxShadow: neonGlow(N.kitchen, 10),
                  }}
                >
                  <LocalFireDepartmentRoundedIcon sx={{ fontSize: 17, color: N.sun }} />
                  {streak}
                </Box>
              )}
            </Stack>
            <Typography sx={{ color: N.textSoft, fontSize: "0.9rem", mb: 1.5 }}>
              Everyone gets the same orders, street, words and pond. One shot a day!
            </Typography>
            <Stack direction="row" spacing={1}>
              {DAILY_ADVENTURES.map(({ mode, emoji, accent }) => {
                const done = dailyDone(mode);
                return (
                  <ButtonBase
                    key={mode}
                    onClick={() => push(`/play/${mode}?daily=1`)}
                    aria-label={`Play today's ${MODE_LABELS[mode]} challenge`}
                    sx={{
                      flex: 1,
                      gap: 0.75,
                      py: 1.1,
                      clipPath: CLIP.button,
                      bgcolor: N.bgRaise,
                      border: `1px solid ${done ? N.brand : accent}59`,
                      color: N.text,
                      fontFamily: "var(--font-arcade)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      "&:hover": { boxShadow: `0 0 12px ${done ? N.brand : accent}40` },
                      "&:active": { transform: "translateY(2px)" },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        bgcolor: done ? N.brand : "transparent",
                        border: done ? "none" : `1px solid ${accent}73`,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 14,
                        boxShadow: done ? `0 0 10px ${N.brand}99` : undefined,
                      }}
                    >
                      {done ? <CheckRoundedIcon sx={{ fontSize: 17, color: N.bg }} /> : emoji}
                    </Box>
                    {MODE_SHORT_LABELS[mode]}
                  </ButtonBase>
                );
              })}
            </Stack>
          </Box>

          {/* Footer nav */}
          <Stack direction={{ xs: "row", md: "column" }} spacing={1}>
            {(
              [
                { label: "Ranks", to: "/scoreboard" },
                { label: "My runs", to: "/my-scores" },
                { label: `${trophyCount}/${ACHIEVEMENTS.length}`, to: "/trophies", icon: true },
              ] as const
            ).map(({ label, to, ...rest }) => (
              <ButtonBase
                key={to}
                onClick={() => push(to)}
                sx={{
                  flex: 1,
                  minHeight: 40,
                  gap: 0.5,
                  clipPath: CLIP.button,
                  color: N.delivery,
                  border: `1px solid ${N.delivery}59`,
                  fontFamily: "var(--font-arcade)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  "&:hover": { bgcolor: `${N.delivery}14`, boxShadow: `0 0 12px ${N.delivery}40` },
                }}
              >
                {"icon" in rest && <EmojiEventsRoundedIcon sx={{ fontSize: 17 }} />}
                {label}
              </ButtonBase>
            ))}
          </Stack>
        </Box>
      </Stack>
    </NeonPage>
  );
}

export default function AdventureHub() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
