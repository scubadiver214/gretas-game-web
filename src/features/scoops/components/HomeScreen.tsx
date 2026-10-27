"use client";

import { fx } from "@/lib/fx";
import { levelProgress, rankForLevel } from "../config";
import { catalog } from "../game-data/catalog";
import { useScoops } from "../ScoopsProvider";
import { Mascot } from "./Mascot";
import { ProgressBar } from "./ShopBar";

interface HomeScreenProps {
  onMake: () => void;
  onBook: () => void;
  onCommunity: () => void;
  onBadges: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onDemo: () => void;
}

export function HomeScreen({ onMake, onBook, onCommunity, onBadges, onProfile, onSettings, onDemo }: HomeScreenProps) {
  const { session, nickname } = useScoops();
  const event = session?.event;
  const progress = levelProgress(session?.user.xp ?? 0);
  const avatar = catalog.avatarById.get(session?.user.avatar ?? "classic");
  const isShelby = nickname.toLowerCase() === "shelby";
  return (
    <div className="home">
      <Mascot mood="happy" size={148} />
      <div>
        <h1>Shelby&apos;s Scoops!</h1>
        <p style={{ margin: "6px 0 0", fontSize: "1.15rem" }}>
          {avatar?.emoji} {session?.user.displayName ?? "Scooper"} the {rankForLevel(session?.user.level ?? 1)}
        </p>
      </div>
      {progress.nextAt !== null && (
        <div style={{ width: "min(320px, 100%)" }}>
          <ProgressBar into={progress.into} span={progress.span} />
        </div>
      )}
      {event && (
        <div className="banner">
          <strong>
            {event.kind === "double-xp" ? "🎉" : event.kind === "mystery" ? "❓" : "🌟"} {event.title}
          </strong>
          <div>{event.completed ? "You already did it today. Nice!" : event.detail}</div>
        </div>
      )}
      <button
        type="button"
        className="scoop-btn tone-pink size-xl"
        data-testid="make-ice-cream"
        onClick={() => {
          fx.unlock();
          fx.tap();
          onMake();
        }}
      >
        🍦 MAKE ICE CREAM
      </button>
      <div className="home-grid">
        <button type="button" className="scoop-btn tone-blue" onClick={onBook}>
          📖 My Scoop Book
        </button>
        <button type="button" className="scoop-btn tone-mint" onClick={onCommunity}>
          🌎 Community
        </button>
        <button type="button" className="scoop-btn tone-orange" onClick={onBadges}>
          🏆 Badges
        </button>
        <button type="button" className="scoop-btn tone-purple" onClick={onProfile}>
          👤 My Profile
        </button>
        <button type="button" className="scoop-btn tone-cream" onClick={onSettings}>
          ⚙️ Settings
        </button>
        {!isShelby && (
          <button type="button" className="scoop-btn tone-cream" onClick={onDemo}>
            Demo: play as Shelby
          </button>
        )}
      </div>
      {!isShelby && <p style={{ margin: 0, maxWidth: 420 }}>The demo button switches your game nickname to Shelby, who already has a full scoop book.</p>}
      {isShelby && <p style={{ margin: 0 }}>You&apos;re signed in as Shelby. The freezer is wide open.</p>}
    </div>
  );
}
