"use client";

import { fx } from "@/lib/fx";
import { useSettingsStore } from "@/features/settings/store";
import { rankForLevel } from "../config";
import { useScoops } from "../ScoopsProvider";

export function ShopBar({ title, onBack, backLabel }: { title?: string; onBack: () => void; backLabel: string }) {
  const session = useScoops().session;
  const soundOn = useSettingsStore((s) => s.soundOn);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const level = session?.user.level ?? 1;
  return (
    <header className="shop-bar">
      <button type="button" className="scoop-btn tone-cream" onClick={onBack}>
        {backLabel}
      </button>
      {title ? (
        <h1 className="screen-title" style={{ flex: 1, fontSize: "1.45rem" }}>
          {title}
        </h1>
      ) : (
        <span style={{ flex: 1 }} />
      )}
      <span className="chip" title={rankForLevel(level)}>
        ⭐ {level}
      </span>
      <span className="chip">🪙 {session?.user.coins ?? 0}</span>
      <button
        type="button"
        className="scoop-btn tone-cream"
        aria-pressed={soundOn}
        aria-label={soundOn ? "Sound on" : "Sound off"}
        onClick={() => {
          fx.unlock();
          fx.tap();
          toggleSound();
        }}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>
    </header>
  );
}

export function ProgressBar({ into, span }: { into: number; span: number }) {
  const width = Math.max(6, Math.min(100, (into / span) * 100));
  return (
    <div className="bar" aria-hidden>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}
