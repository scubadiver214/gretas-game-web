"use client";

import { useSettingsStore } from "@/features/settings/store";
import { levelProgress, rankForLevel } from "../config";
import { catalog, isAvailable } from "../game-data/catalog";
import { useScoops } from "../ScoopsProvider";
import { Mascot } from "./Mascot";
import { ProgressBar } from "./ShopBar";

export function AchievementsScreen() {
  const { session } = useScoops();
  const earned = new Set(session?.achievements.map((badge) => badge.id) ?? []);
  return (
    <div className="badge-list">
      {catalog.achievements.map((badge) => {
        const got = earned.has(badge.id);
        return (
          <article key={badge.id} className={`badge ${got ? "" : "is-locked"}`}>
            <span style={{ fontSize: "2rem" }} aria-hidden>{got ? badge.emoji : "🔒"}</span>
            <div>
              <strong>{badge.name}</strong>
              <div>{got ? badge.description : "Keep scooping to find this one."}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ProfileScreen() {
  const { session, setAvatar } = useScoops();
  if (!session) return null;
  const progress = levelProgress(session.user.xp);
  return (
    <div className="home">
      <Mascot mood="love" size={120} />
      <h2 style={{ margin: 0 }}>{session.user.displayName}</h2>
      <p style={{ margin: 0 }}>
        Level {session.user.level} · {rankForLevel(session.user.level)}
      </p>
      {progress.nextAt !== null ? <ProgressBar into={progress.into} span={progress.span} /> : <p>Top of the shop!</p>}
      <p style={{ margin: 0 }}>
        {session.user.recipesCreated} recipes · {session.user.recipesDiscovered} discoveries · 🪙 {session.user.coins}
      </p>
      <p style={{ margin: 0 }}>Save special scoops to win avatar prizes.</p>
      <div className="avatar-grid">
        {catalog.avatars.map((avatar) => {
          const open = isAvailable(avatar, session.user.level, new Set(session.unlocks.avatars));
          const selected = session.user.avatar === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              className={`ing-card ${selected ? "is-on" : ""} ${open ? "" : "is-locked"}`}
              aria-pressed={selected}
              aria-label={open ? avatar.name : `${avatar.name}. ${avatar.prize ?? "Still locked"}`}
              onClick={() => {
                if (open) void setAvatar(avatar.id);
              }}
            >
              <span className="emoji">{open ? avatar.emoji : "🔒"}</span>
              <span className="label">{avatar.name}</span>
              {!open && <span className="lock">{avatar.prize ?? `Level ${avatar.unlockLevel}`}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsScreen({ onTour }: { onTour: () => void }) {
  const soundOn = useSettingsStore((s) => s.soundOn);
  const musicOn = useSettingsStore((s) => s.musicOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleMusic = useSettingsStore((s) => s.toggleMusic);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);
  const toggleReducedMotion = useSettingsStore((s) => s.toggleReducedMotion);
  return (
    <div className="home">
      <h2 style={{ margin: 0 }}>Shop settings</h2>
      <p style={{ margin: 0, maxWidth: 460 }}>Sounds follow the same switch as the rest of Greta&apos;s Games. Shelby does not play a loud song.</p>
      <Toggle label={soundOn ? "Sound on" : "Sound off"} on={soundOn} onClick={toggleSound} />
      <Toggle label={musicOn ? "Music on" : "Music off"} on={musicOn} onClick={toggleMusic} />
      <Toggle label={hapticsOn ? "Bumps on" : "Bumps off"} on={hapticsOn} onClick={toggleHaptics} />
      <Toggle label={reducedMotion ? "Calm motion" : "Bouncy motion"} on={!reducedMotion} onClick={toggleReducedMotion} />
      <button type="button" className="scoop-btn tone-pink" onClick={onTour}>Show me how again</button>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`scoop-btn ${on ? "tone-mint" : "tone-cream"}`} aria-pressed={on} onClick={onClick} style={{ width: "min(360px, 100%)" }}>
      {label}
    </button>
  );
}
