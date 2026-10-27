"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { BADGE_BY_ID } from "../badges";
import { useHuntProgress } from "../progress";
import { SPECIES_BY_ID } from "../species";
import type { HudSnapshot } from "../types";
import { useHuntHud } from "../useHuntHud";
import { H, TONE_COLOR, bigText, formatClock, plate } from "./hudStyle";

function Shell({ loaded }: { loaded: boolean }) {
  return (
    <Box sx={{ display: "flex", width: 44, height: 14, filter: loaded ? "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" : "none", opacity: loaded ? 1 : 0.28, transition: "opacity 160ms" }}>
      <Box sx={{ width: 11, borderRadius: "3px 1px 1px 3px", background: "linear-gradient(180deg,#f6dc8a,#c9962e 60%,#9c6f17)" }} />
      <Box
        sx={{
          flex: 1,
          borderRadius: "1px 4px 4px 1px",
          background: loaded ? "linear-gradient(180deg,#ff6a5c,#d0261d 55%,#93140f)" : "linear-gradient(180deg,#9aa3ad,#5f6874)",
          backgroundImage: loaded ? "repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 5px), linear-gradient(180deg,#ff6a5c,#d0261d 55%,#93140f)" : undefined,
        }}
      />
    </Box>
  );
}

function Ammo({ hud }: { hud: HudSnapshot }) {
  if (hud.tool !== "shotgun") return null;
  return (
    <Box sx={{ position: "absolute", top: "max(14px, env(safe-area-inset-top))", left: "max(14px, env(safe-area-inset-left))", display: "flex", flexDirection: "column", gap: "5px" }} aria-label={`${hud.mag} shells loaded`}>
      {Array.from({ length: hud.magSize }).map((_, i) => (
        <Shell key={i} loaded={i < hud.mag} />
      ))}
      <Typography sx={{ ...bigText, fontSize: 13, mt: 0.3, opacity: 0.9 }}>{hud.reserve === null ? "+ ∞" : `+ ${hud.reserve}`}</Typography>
      {hud.weapon === "reloading" && (
        <Box sx={{ mt: 0.3 }}>
          <Typography sx={{ ...bigText, fontSize: 11, color: H.gold, letterSpacing: 1 }}>RELOADING</Typography>
          <Box sx={{ mt: 0.3, width: 44, height: 4, borderRadius: 2, bgcolor: "rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <Box sx={{ width: `${hud.reloadProgress * 100}%`, height: "100%", bgcolor: H.gold, transition: "width 80ms linear" }} />
          </Box>
        </Box>
      )}
      {hud.mag === 0 && hud.weapon !== "reloading" && hud.reserve !== 0 && <Typography sx={{ ...bigText, fontSize: 11, color: H.gold }}>Press R</Typography>}
    </Box>
  );
}

function ScorePlate({ hud, compact }: { hud: HudSnapshot; compact: boolean }) {
  const [two, three] = hud.starScores;
  const max = three * 1.15;
  const fill = Math.min(1, hud.score / max);
  const marks = [
    { v: two, stars: 2 },
    { v: three, stars: 3 },
  ];
  const explore = hud.activity === "explore";
  return (
    <Box sx={{ position: "absolute", top: "max(10px, env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 0.6, pointerEvents: "none" }}>
      <Box sx={{ ...plate, display: "flex", alignItems: "center", gap: compact ? 1 : 1.5, px: compact ? 1.2 : 1.6, py: 0.6, minWidth: compact ? 280 : 380 }}>
        <Box sx={{ minWidth: compact ? 58 : 72 }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: H.rim, lineHeight: 1 }}>{explore ? "PHOTOS" : "SCORE"}</Typography>
          <Typography sx={{ ...bigText, fontSize: compact ? 20 : 24, fontVariantNumeric: "tabular-nums" }}>{explore ? hud.photos : hud.score.toLocaleString()}</Typography>
        </Box>
        {!explore && (
          <Box sx={{ flex: 1, position: "relative", height: 34, minWidth: compact ? 120 : 180 }}>
            <Box sx={{ position: "absolute", left: 0, right: 0, top: 8, height: 10, borderRadius: 5, bgcolor: "rgba(0,0,0,0.45)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)", overflow: "hidden" }}>
              <Box sx={{ width: `${fill * 100}%`, height: "100%", background: `linear-gradient(90deg, ${H.orange}, ${H.red})`, transition: "width 250ms ease-out" }} />
            </Box>
            {marks.map((m) => {
              const reached = hud.score >= m.v && hud.objectiveMet;
              return (
                <Box key={m.stars} sx={{ position: "absolute", left: `${(m.v / max) * 100}%`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box sx={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${reached ? H.gold : "#ff5446"}` }} />
                  <Box sx={{ height: 12 }} />
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {Array.from({ length: m.stars }).map((_, i) => (
                      <StarRoundedIcon key={i} sx={{ fontSize: 11, color: reached ? H.gold : "rgba(255,255,255,0.55)" }} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        {hud.goalKind !== "none" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }} aria-label={`${hud.progress} of ${hud.goal}`}>
            <Box sx={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: hud.objectiveMet ? `radial-gradient(circle, ${H.green}, ${H.greenDeep})` : "radial-gradient(circle, #6fd36f, #2c8a3a)", border: "2px solid rgba(255,255,255,0.8)", boxShadow: hud.objectiveMet ? `0 0 10px ${H.green}` : undefined }}>
              <Box sx={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative", "&::before,&::after": { content: '""', position: "absolute", bgcolor: "#fff" }, "&::before": { left: "50%", top: -5, bottom: -5, width: 2, ml: "-1px" }, "&::after": { top: "50%", left: -5, right: -5, height: 2, mt: "-1px" } }} />
            </Box>
            <Typography sx={{ ...bigText, fontSize: compact ? 17 : 20, fontVariantNumeric: "tabular-nums" }}>
              {Math.min(hud.progress, hud.goal)}/{hud.goal}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
        <Typography sx={{ ...bigText, fontSize: 12, px: 1, py: 0.3, borderRadius: 999, bgcolor: "rgba(0,0,0,0.35)" }}>
          {explore ? "Wildlife Explorer" : `Level ${hud.levelNumber} · ${hud.levelName}`}
        </Typography>
        {hud.timeLeft !== null && (
          <Typography sx={{ ...bigText, fontSize: 14, px: 1, py: 0.2, borderRadius: 999, bgcolor: hud.timeLeft <= 10 ? "rgba(229,57,47,0.85)" : "rgba(0,0,0,0.35)", fontVariantNumeric: "tabular-nums", animation: hud.timeLeft <= 10 ? "huntPulse 0.9s ease-in-out infinite" : undefined, "@keyframes huntPulse": { "50%": { transform: "scale(1.08)" } } }}>
            ⏱ {formatClock(hud.timeLeft)}
          </Typography>
        )}
        {hud.multiplier > 1 && (
          <Typography key={hud.streak} sx={{ ...bigText, fontSize: 13, px: 1, py: 0.25, borderRadius: 999, background: `linear-gradient(180deg, ${H.orange}, ${H.orangeDeep})`, animation: "huntPop 260ms ease-out", "@keyframes huntPop": { from: { transform: "scale(1.4)" }, to: { transform: "scale(1)" } } }}>
            ×{hud.multiplier} · {hud.streak} in a row
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function Reticle({ hud }: { hud: HudSnapshot }) {
  const hot = hud.onTarget;
  const size = hud.ads ? 34 : 46;
  const color = hot ? H.gold : "rgba(255,255,255,0.92)";
  return (
    <Box aria-hidden sx={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, transform: `translate(-50%,-50%) scale(${hot ? 0.86 : 1})`, transition: "transform 120ms, width 160ms, height 160ms", pointerEvents: "none", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))" }}>
      <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${color}` }} />
      {[0, 90, 180, 270].map((a) => (
        <Box key={a} sx={{ position: "absolute", left: "50%", top: "50%", width: 2, height: 9, bgcolor: color, transform: `translate(-50%,-50%) rotate(${a}deg) translateY(${-size / 2 - 3}px)` }} />
      ))}
      <Box sx={{ position: "absolute", left: "50%", top: "50%", width: 5, height: 5, borderRadius: "50%", bgcolor: hot ? H.red : color, transform: "translate(-50%,-50%)" }} />
    </Box>
  );
}

function Viewfinder({ hud }: { hud: HudSnapshot }) {
  const discovered = useHuntProgress((s) => s.journal);
  const f = hud.framing;
  const known = f ? !!discovered[f.species] : false;
  const label = f ? (known ? SPECIES_BY_ID[f.species].name : "??? New animal!") : "Find an animal";
  const color = f ? (f.stars >= 3 ? H.green : f.stars === 2 ? H.gold : "#ffffff") : "rgba(255,255,255,0.7)";
  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Box sx={{ position: "absolute", left: "50%", top: "50%", height: "78%", aspectRatio: "4 / 3", maxWidth: "92%", transform: "translate(-50%,-50%)" }}>
        {[
          { top: 0, left: 0, b: "borderTop", s: "borderLeft" },
          { top: 0, right: 0, b: "borderTop", s: "borderRight" },
          { bottom: 0, left: 0, b: "borderBottom", s: "borderLeft" },
          { bottom: 0, right: 0, b: "borderBottom", s: "borderRight" },
        ].map(({ b, s, ...pos }, i) => (
          <Box key={i} sx={{ position: "absolute", width: 38, height: 38, ...pos, [b]: "4px solid rgba(255,255,255,0.9)", [s]: "4px solid rgba(255,255,255,0.9)", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.6))" }} />
        ))}
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "33.33% 33.33%", backgroundPosition: "-1px -1px" }} />
        <Box sx={{ position: "absolute", left: "50%", top: "50%", width: 64, height: 64, transform: "translate(-50%,-50%)", border: `3px solid ${color}`, borderRadius: "8px", transition: "border-color 150ms", boxShadow: f ? `0 0 12px ${color}88` : undefined }} />
        <Box sx={{ position: "absolute", left: 12, top: 10, display: "flex", gap: 0.8, alignItems: "center" }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: H.red, animation: "huntBlink 1.2s steps(2) infinite", "@keyframes huntBlink": { "50%": { opacity: 0.2 } } }} />
          <Typography sx={{ ...bigText, fontSize: 14 }}>{hud.zoom}× ZOOM</Typography>
        </Box>
        <Typography sx={{ ...bigText, position: "absolute", right: 12, top: 10, fontSize: 14 }}>📷 {hud.photos}</Typography>
        <Box sx={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 0.8, px: 1.4, py: 0.5, borderRadius: 999, bgcolor: "rgba(0,0,0,0.45)" }}>
          <Typography sx={{ ...bigText, fontSize: 15, color }}>{label}</Typography>
          {f && (
            <Box sx={{ display: "flex" }}>
              {[1, 2, 3].map((i) => (
                <StarRoundedIcon key={i} sx={{ fontSize: 16, color: i <= f.stars ? H.gold : "rgba(255,255,255,0.3)" }} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Popups() {
  const popups = useHuntHud((s) => s.popups);
  return (
    <>
      {popups.map((p) => (
        <Box key={p.id} sx={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)", pointerEvents: "none", textAlign: "center", animation: "huntRise 1.05s ease-out forwards", "@keyframes huntRise": { "0%": { opacity: 0, transform: "translate(-50%,-30%) scale(0.6)" }, "15%": { opacity: 1, transform: "translate(-50%,-60%) scale(1.15)" }, "100%": { opacity: 0, transform: "translate(-50%,-180%) scale(1)" } } }}>
          <Typography sx={{ ...bigText, fontSize: 30, color: TONE_COLOR[p.tone], WebkitTextStroke: "1px rgba(0,0,0,0.4)" }}>{p.text}</Typography>
          {p.sub && <Typography sx={{ ...bigText, fontSize: 14 }}>{p.sub}</Typography>}
        </Box>
      ))}
    </>
  );
}

function BannerView() {
  const banner = useHuntHud((s) => s.banner);
  if (!banner) return null;
  return (
    <Box key={banner.id} role="status" sx={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)", maxWidth: "min(560px, 88vw)", pointerEvents: "none", animation: "huntBanner 280ms ease-out", "@keyframes huntBanner": { from: { opacity: 0, transform: "translate(-50%, -12px) scale(0.92)" }, to: { opacity: 1, transform: "translate(-50%, 0) scale(1)" } } }}>
      <Typography sx={{ ...bigText, textAlign: "center", fontSize: banner.long ? 20 : 34, color: TONE_COLOR[banner.tone], px: banner.long ? 2 : 0, py: banner.long ? 1 : 0, borderRadius: 3, bgcolor: banner.long ? "rgba(10,20,30,0.6)" : "transparent", WebkitTextStroke: banner.long ? undefined : "1px rgba(0,0,0,0.35)" }}>
        {banner.text}
      </Typography>
    </Box>
  );
}

function PhotoCardView() {
  const photo = useHuntHud((s) => s.photo);
  if (!photo) return null;
  const sp = photo.result.species ? SPECIES_BY_ID[photo.result.species] : null;
  return (
    <Box key={photo.id} sx={{ position: "absolute", right: "max(16px, env(safe-area-inset-right))", bottom: 112, width: 230, pointerEvents: "none", animation: "huntSlide 320ms cubic-bezier(.2,1.4,.4,1)", "@keyframes huntSlide": { from: { opacity: 0, transform: "translateX(40px) rotate(6deg)" }, to: { opacity: 1, transform: "rotate(-3deg)" } }, transform: "rotate(-3deg)" }}>
      <Box sx={{ bgcolor: "#fffdf6", p: 1, pb: 1.2, borderRadius: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", color: H.ink }}>
        {photo.thumb ? (
          <Box component="img" src={photo.thumb} alt={sp ? `Your photo of a ${sp.name}` : "Your photo"} sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", borderRadius: "2px" }} />
        ) : (
          <Box sx={{ width: "100%", aspectRatio: "4 / 3", bgcolor: "#cfe3f2", display: "grid", placeItems: "center", fontSize: 40 }}>📷</Box>
        )}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.8 }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>{sp ? `${sp.emoji} ${sp.name}` : "No animal"}</Typography>
          <Box sx={{ display: "flex" }}>
            {[1, 2, 3].map((i) => (
              <StarRoundedIcon key={i} sx={{ fontSize: 18, color: i <= photo.result.stars ? H.goldDeep : "rgba(0,0,0,0.18)" }} />
            ))}
          </Box>
        </Box>
        {photo.isNew && sp ? (
          <>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 12, color: H.greenDeep, mt: 0.4 }}>✨ NEW DISCOVERY! Added to your Field Journal</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.3, lineHeight: 1.3 }}>{sp.fact}</Typography>
          </>
        ) : (
          <Typography sx={{ fontSize: 12, mt: 0.3, color: "#4a5560" }}>{photo.result.tip}</Typography>
        )}
      </Box>
    </Box>
  );
}

function BadgeToast() {
  const badges = useHuntHud((s) => s.badges);
  const shift = useHuntHud((s) => s.shiftBadge);
  const id = badges[0];
  const b = id ? BADGE_BY_ID[id] : null;
  if (!b) return null;
  return (
    <Box key={id} onAnimationEnd={shift} sx={{ position: "absolute", top: 70, right: "max(14px, env(safe-area-inset-right))", display: "flex", gap: 1, alignItems: "center", px: 1.5, py: 1, borderRadius: 3, border: `2px solid ${H.gold}`, background: `linear-gradient(180deg, ${H.forest}, ${H.forestDeep})`, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", pointerEvents: "none", animation: "huntToast 3.2s ease-in-out forwards", "@keyframes huntToast": { "0%": { opacity: 0, transform: "translateY(-10px)" }, "8%,85%": { opacity: 1, transform: "none" }, "100%": { opacity: 0 } } }}>
      <Typography sx={{ fontSize: 28 }}>{b.emoji}</Typography>
      <Box>
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 11, color: H.gold, letterSpacing: 1 }}>BADGE UNLOCKED</Typography>
        <Typography sx={{ ...bigText, fontSize: 16 }}>{b.title}</Typography>
      </Box>
    </Box>
  );
}

function Hints({ hud, touch }: { hud: HudSnapshot; touch: boolean }) {
  const hints = useHuntProgress((s) => s.hints);
  if (!hints || touch) return null;
  const items =
    hud.tool === "camera"
      ? [["Click", "Snap photo"], ["Right-click / wheel", "Zoom"], ...(hud.activity === "explore" ? [] : [["Q", "Back to shotgun"]]), ["Esc", "Pause"]]
      : [["Click", "Shoot"], ["Right-click", "Aim"], ["R", "Reload"], ["Q", "Camera"], ["Esc", "Pause"]];
  return (
    <Box sx={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 0.8, pointerEvents: "none", opacity: 0.85 }}>
      {items.map(([k, v]) => (
        <Typography key={k} sx={{ ...bigText, fontSize: 12, px: 1, py: 0.35, borderRadius: 999, bgcolor: "rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
          <Box component="span" sx={{ color: H.gold }}>{k}</Box> {v}
        </Typography>
      ))}
    </Box>
  );
}

function Countdown({ n }: { n: number }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
      <Typography key={n} sx={{ ...bigText, fontSize: 120, color: H.gold, WebkitTextStroke: "3px rgba(0,0,0,0.35)", animation: "huntCount 0.8s ease-out", "@keyframes huntCount": { from: { opacity: 0, transform: "scale(1.8)" }, "30%": { opacity: 1, transform: "scale(1)" }, to: { opacity: 0.2, transform: "scale(0.9)" } } }}>
        {n}
      </Typography>
    </Box>
  );
}

/** The in-game HUD, laid out like the reference screenshot. */
export default function HuntHud({ touch, onPause }: { touch: boolean; onPause: () => void }) {
  const hud = useHuntHud((s) => s.hud);
  if (!hud || hud.phase === "ready") return null;
  const active = hud.phase === "playing" || hud.phase === "countdown";
  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none" }}>
      {hud.tool === "camera" && active ? <Viewfinder hud={hud} /> : active && <Reticle hud={hud} />}
      <Ammo hud={hud} />
      <ScorePlate hud={hud} compact={touch} />
      <Popups />
      <BannerView />
      <PhotoCardView />
      <BadgeToast />
      {hud.phase === "countdown" && <Countdown n={hud.countdown} />}
      {active && <Hints hud={hud} touch={touch} />}
      {active && (
        <IconButton aria-label="Pause" onClick={onPause} onPointerDown={(e) => e.stopPropagation()} sx={{ ...plate, position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: "max(14px, env(safe-area-inset-right))", width: 48, height: 48, borderRadius: "10px", pointerEvents: "auto", "&:hover": { filter: "brightness(1.15)" } }}>
          <PauseRoundedIcon sx={{ color: H.gold, fontSize: 30 }} />
        </IconButton>
      )}
    </Box>
  );
}
