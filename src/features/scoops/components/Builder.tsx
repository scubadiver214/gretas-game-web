"use client";

import { useEffect, useMemo, useState } from "react";
import { fx } from "@/lib/fx";
import { useSettingsStore } from "@/features/settings/store";
import { ScoopProblem } from "../api/client";
import { DROPPED_SCOOP, MIX_LABELS } from "../config";
import { clearDraft, saveDraft, type ScoopDraft } from "../draft";
import { catalog, isAvailable } from "../game-data/catalog";
import { addExtra, addFlavor, addSauce, addTopping, creationsEqual, pushHistory, redoHistory, removeIngredient, setContainer, setMix, undoHistory, type CreationHistory, type IngredientSlot } from "../logic/creation";
import { suggestNames } from "../logic/rank";
import { useScoops } from "../ScoopsProvider";
import type { CurrentCreation, MixStyle, SaveResult, UnlockRule } from "../types";
import { IceCreamPreview } from "./IceCreamPreview";
import { Mascot } from "./Mascot";

type Category = "serve" | "scoops" | "toppings" | "sauces" | "extras";
type Phase = "play" | "name" | "party";

const CATS: { id: Category; label: string; emoji: string }[] = [
  { id: "serve", label: "Serve", emoji: "🍦" },
  { id: "scoops", label: "Scoops", emoji: "🍨" },
  { id: "toppings", label: "Toppings", emoji: "🌈" },
  { id: "sauces", label: "Sauces", emoji: "🍫" },
  { id: "extras", label: "Extras", emoji: "🍒" },
];

const RAIN = new Set(["sprinkles", "rainbow-sprinkles", "pop-rocks", "candies"]);
const MIXES: MixStyle[] = ["single", "double", "triple", "swirl", "layered", "half", "crazy"];

interface BuilderProps {
  draft: ScoopDraft;
  tutorial: boolean;
  onExit: () => void;
  onBook: () => void;
  onTutorialDone: () => void;
}

function plopWord(slot: IngredientSlot, id: string): string {
  if (slot === "flavor") return "plop!";
  if (slot === "sauce") return "drizzle!";
  if (slot === "topping" && RAIN.has(id)) return "yay!";
  if (slot === "extra") return "ta-da!";
  return "yum!";
}

export function Builder({ draft, tutorial, onExit, onBook, onTutorialDone }: BuilderProps) {
  const { session, saveRecipe } = useScoops();
  const calm = useSettingsStore((s) => s.reducedMotion);
  const [history, setHistory] = useState<CreationHistory>({ past: [], present: draft.creation, future: [] });
  const [category, setCategory] = useState<Category>(draft.creation.containerId ? "scoops" : "serve");
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description);
  const [isPublic, setIsPublic] = useState(draft.isPublic);
  const [editingId, setEditingId] = useState(draft.editingId);
  const [inspiredBy, setInspiredBy] = useState(draft.inspiredBy);
  const [banner, setBanner] = useState<string | null>(inspiredBy ? `Making ${inspiredBy.owner}'s "${inspiredBy.name}". Change anything you like!` : null);
  const [plop, setPlop] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [assembleKey, setAssembleKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("play");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [beat, setBeat] = useState(0);
  const [resetAsk, setResetAsk] = useState(false);
  const [step, setStep] = useState(0);
  const creation = history.present;

  useEffect(() => {
    if (!session || phase === "party") return;
    const timer = window.setTimeout(() => {
      saveDraft(session.user.id, { creation, name, description, isPublic, editingId, inspiredBy, savedAt: new Date().toISOString() });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [session, creation, name, description, isPublic, editingId, inspiredBy, phase]);

  useEffect(() => {
    if (!plop) return;
    const timer = window.setTimeout(() => setPlop(null), 700);
    return () => window.clearTimeout(timer);
  }, [plop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || phase !== "play") return;
      event.preventDefault();
      setHistory((current) => (event.shiftKey ? redoHistory(current) : undoHistory(current)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const level = session?.user.level ?? 1;
  const unlocks = session?.unlocks;
  const openItem = (kind: keyof NonNullable<typeof unlocks>, item: UnlockRule & { id: string }) => {
    const explicit = new Set(unlocks?.[kind] ?? []);
    return isAvailable(item, level, explicit);
  };

  const apply = (next: CurrentCreation, message: string | null, slot: IngredientSlot | null, id?: string) => {
    if (message) setBanner(message);
    if (creationsEqual(creation, next)) return;
    if (slot === "flavor") fx.pop();
    else if (slot === "sauce") fx.whoosh();
    else if (slot === "topping" || slot === "extra") fx.ding();
    else fx.tap();
    setHistory((current) => pushHistory(current, next));
    if (id && slot) {
      setJustAdded(id);
      setPlop(plopWord(slot, id));
    }
  };

  const dropOnStage = (raw: string) => {
    const [kind, id] = raw.split(":");
    if (!id) return;
    if (kind === "container") {
      const item = catalog.containerById.get(id);
      if (!item || !openItem("containers", item)) return;
      const change = setContainer(creation, id);
      apply(change.creation, change.message, "container", id);
    } else if (kind === "flavor") {
      const item = catalog.flavorById.get(id);
      if (!item || !openItem("flavors", item)) return;
      const change = addFlavor(creation, id);
      apply(change.creation, change.message, "flavor", id);
    } else if (kind === "topping") {
      const item = catalog.toppingById.get(id);
      if (!item || !openItem("toppings", item)) return;
      const change = addTopping(creation, id);
      apply(change.creation, change.message, "topping", id);
    } else if (kind === "sauce") {
      const item = catalog.sauceById.get(id);
      if (!item || !openItem("sauces", item)) return;
      const change = addSauce(creation, id);
      apply(change.creation, change.message, "sauce", id);
    } else if (kind === "extra") {
      const item = catalog.extraById.get(id);
      if (!item || !openItem("extras", item)) return;
      const change = addExtra(creation, id);
      apply(change.creation, change.message, "extra", id);
    }
  };

  const suggestions = useMemo(() => suggestNames(creation, session?.discoveries ?? []), [creation, session?.discoveries]);

  const finish = () => {
    if (!creation.containerId || creation.flavorIds.length === 0) {
      setBanner("Pick a cone or a cup, and at least one flavor.");
      fx.bad();
      return;
    }
    fx.good();
    setAssembleKey((key) => key + 1);
    if (!name) setName(suggestions[0] ?? "");
    setPhase("name");
  };

  const save = async () => {
    if (!session || saving) return;
    setSaving(true);
    try {
      const saved = await saveRecipe(
        {
          name: name || suggestions[0] || "My Scoop",
          description,
          isPublic,
          containerId: creation.containerId ?? "",
          mix: creation.mix,
          flavorIds: creation.flavorIds,
          toppingIds: creation.toppingIds,
          sauceIds: creation.sauceIds,
          extraIds: creation.extraIds,
          inspiredByRecipeId: inspiredBy?.recipeId,
        },
        editingId,
      );
      clearDraft(session.user.id);
      setResult(saved);
      setBeat(0);
      setPhase("party");
      if (saved.rewards.discoveries.length || saved.rewards.avatars.length) {
        fx.fanfare();
        void burst(calm);
      } else fx.good();
    } catch (err) {
      console.error("[scoops] save", err);
      setBanner(err instanceof ScoopProblem ? err.message : DROPPED_SCOOP);
      fx.bad();
    } finally {
      setSaving(false);
    }
  };

  const beats = result
    ? [
        ...(result.rewards.discoveries.length ? (["secret"] as const) : []),
        ...(result.rewards.avatars.length ? (["avatars"] as const) : []),
        ...(result.rewards.levelAfter > result.rewards.levelBefore ? (["level"] as const) : []),
        ...(result.rewards.achievements.length ? (["badges"] as const) : []),
        "done" as const,
      ]
    : [];
  const currentBeat = beats[beat] ?? "done";

  const another = () => {
    const fresh = { ...creation, flavorIds: [], toppingIds: [], sauceIds: [], extraIds: [], containerId: undefined, mix: "single" as const };
    setHistory({ past: [], present: fresh, future: [] });
    setName("");
    setDescription("");
    setIsPublic(false);
    setEditingId(null);
    setInspiredBy(null);
    setResult(null);
    setPhase("play");
    setCategory("serve");
    setBanner("A fresh cone! What shall we make?");
  };

  return (
    <div className="builder">
      <div className="sr-only" aria-live="polite">
        {banner}
      </div>
      <nav className="builder-cats" aria-label="Ingredient shelves">
        {CATS.map((cat) => (
          <button key={cat.id} type="button" className={`scoop-btn ${category === cat.id ? "tone-pink" : "tone-cream"}`} aria-pressed={category === cat.id} onClick={() => { fx.tap(); setCategory(cat.id); }}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </nav>
      <section className="builder-stage">
        <div
          className="stage"
          data-testid="scoop-stage"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            dropOnStage(event.dataTransfer.getData("text/plain"));
          }}
        >
          <IceCreamPreview creation={creation} assembleKey={assembleKey} animate={!calm} />
          {plop && !calm && <span className="plop">{plop}</span>}
          {justAdded && RAIN.has(justAdded) && !calm && <SprinkleRain />}
        </div>
        <div className="mix-row" role="group" aria-label="Scoop style">
          {MIXES.map((mix) => (
            <button key={mix} type="button" className={`scoop-btn tone-cream ${creation.mix === mix ? "is-on" : ""}`} aria-pressed={creation.mix === mix} onClick={() => {
              const change = setMix(creation, mix);
              apply(change.creation, change.message, null);
              fx.tap();
            }}>
              {MIX_LABELS[mix]}
            </button>
          ))}
        </div>
        {banner && <p className="speech" style={{ margin: "8px 0 0" }}>{banner}</p>}
        {inspiredBy && phase === "play" && (
          <p style={{ margin: "6px 0 0" }}>Inspired by {inspiredBy.owner}&apos;s &quot;{inspiredBy.name}&quot;</p>
        )}
      </section>
      <aside className="builder-summary summary" aria-label="My creation">
        <h2>My creation</h2>
        <ul>
          <Line label={catalog.containerById.get(creation.containerId ?? "")?.name ?? "Pick a cone or cup"} onRemove={creation.containerId ? () => apply(removeIngredient(creation, "container", creation.containerId ?? "").creation, null, null) : undefined} />
          {creation.flavorIds.map((id) => (
            <Line key={id} label={`${catalog.flavorById.get(id)?.emoji ?? ""} ${catalog.flavorById.get(id)?.name ?? id}`} onRemove={() => apply(removeIngredient(creation, "flavor", id).creation, null, null)} />
          ))}
          {creation.toppingIds.map((id) => (
            <Line key={id} label={`${catalog.toppingById.get(id)?.emoji ?? ""} ${catalog.toppingById.get(id)?.name ?? id}`} onRemove={() => apply(removeIngredient(creation, "topping", id).creation, null, null)} />
          ))}
          {creation.sauceIds.map((id) => (
            <Line key={id} label={`${catalog.sauceById.get(id)?.emoji ?? ""} ${catalog.sauceById.get(id)?.name ?? id}`} onRemove={() => apply(removeIngredient(creation, "sauce", id).creation, null, null)} />
          ))}
          {creation.extraIds.map((id) => (
            <Line key={id} label={`${catalog.extraById.get(id)?.emoji ?? ""} ${catalog.extraById.get(id)?.name ?? id}`} onRemove={() => apply(removeIngredient(creation, "extra", id).creation, null, null)} />
          ))}
        </ul>
      </aside>
      <div className="builder-tray tray">
        {category === "serve" && (
          <>
            <h3 className="group-label">Cones</h3>
            {catalog.containers.filter((item) => item.serve === "cone").map((item) => (
              <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.containerId === item.id} locked={!openItem("containers", item)} level={item.unlockLevel} drag={`container:${item.id}`} onClick={() => {
                if (!openItem("containers", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
                const change = setContainer(creation, item.id);
                apply(change.creation, change.message, "container", item.id);
              }} />
            ))}
            <h3 className="group-label">Cups</h3>
            {catalog.containers.filter((item) => item.serve === "cup").map((item) => (
              <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.containerId === item.id} locked={!openItem("containers", item)} level={item.unlockLevel} drag={`container:${item.id}`} onClick={() => {
                if (!openItem("containers", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
                const change = setContainer(creation, item.id);
                apply(change.creation, change.message, "container", item.id);
              }} />
            ))}
          </>
        )}
        {category === "scoops" && catalog.flavors.map((item) => (
          <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.flavorIds.includes(item.id)} locked={!openItem("flavors", item)} level={item.unlockLevel} drag={`flavor:${item.id}`} onClick={() => {
            if (!openItem("flavors", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
            const change = addFlavor(creation, item.id);
            apply(change.creation, change.message, "flavor", item.id);
          }} />
        ))}
        {category === "toppings" && catalog.toppings.map((item) => (
          <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.toppingIds.includes(item.id)} locked={!openItem("toppings", item)} level={item.unlockLevel} drag={`topping:${item.id}`} onClick={() => {
            if (!openItem("toppings", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
            const change = addTopping(creation, item.id);
            apply(change.creation, change.message, "topping", item.id);
          }} />
        ))}
        {category === "sauces" && catalog.sauces.map((item) => (
          <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.sauceIds.includes(item.id)} locked={!openItem("sauces", item)} level={item.unlockLevel} drag={`sauce:${item.id}`} onClick={() => {
            if (!openItem("sauces", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
            const change = addSauce(creation, item.id);
            apply(change.creation, change.message, "sauce", item.id);
          }} />
        ))}
        {category === "extras" && catalog.extras.map((item) => (
          <IngredientButton key={item.id} emoji={item.emoji} name={item.name} selected={creation.extraIds.includes(item.id)} locked={!openItem("extras", item)} level={item.unlockLevel} drag={`extra:${item.id}`} onClick={() => {
            if (!openItem("extras", item)) return setBanner(`${item.name} unlocks at level ${item.unlockLevel}!`);
            const change = addExtra(creation, item.id);
            apply(change.creation, change.message, "extra", item.id);
          }} />
        ))}
      </div>
      <div className="builder-actions">
        <button type="button" className="scoop-btn tone-cream" onClick={() => setHistory((current) => undoHistory(current))} disabled={history.past.length === 0}>Undo</button>
        <button type="button" className="scoop-btn tone-cream" onClick={() => setHistory((current) => redoHistory(current))} disabled={history.future.length === 0}>Redo</button>
        <button type="button" className="scoop-btn tone-cream" onClick={() => setResetAsk(true)}>Start over</button>
        <button type="button" className="scoop-btn tone-blue" onClick={() => { fx.pop(); setAssembleKey((key) => key + 1); setPlop("scoop!"); }}>Make my scoop!</button>
        <button type="button" className="scoop-btn tone-pink" data-testid="finish-scoop" onClick={finish}>Finish scoop</button>
        <button type="button" className="scoop-btn tone-cream" onClick={onExit}>Back</button>
      </div>
      {tutorial && phase === "play" && (
        <div className="speech" style={{ position: "fixed", left: 12, right: 12, bottom: 92, zIndex: 6, display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
          <Mascot size={72} className="mascot" />
          <div>
            <strong>{TOUR[step]}</strong>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" className="scoop-btn tone-pink" onClick={() => { if (step >= TOUR.length - 1) onTutorialDone(); else setStep((n) => n + 1); }}>
                {step >= TOUR.length - 1 ? "Let's scoop!" : "Next"}
              </button>
              <button type="button" className="scoop-btn tone-cream" onClick={onTutorialDone}>I know how!</button>
            </div>
          </div>
        </div>
      )}
      {phase === "name" && (
        <div className="sheet" role="dialog" aria-labelledby="name-scoop">
          <div className="sheet-card">
            <Mascot mood="wow" size={96} />
            <h2 id="name-scoop">What should we call it?</h2>
            <div className="name-picks">
              {suggestions.map((idea) => (
                <button key={idea} type="button" className={`scoop-btn ${name === idea ? "tone-pink" : "tone-cream"}`} onClick={() => setName(idea)}>{idea}</button>
              ))}
            </div>
            <input type="text" aria-label="Scoop name" maxLength={28} value={name} placeholder="Type a name" onChange={(event) => setName(event.target.value)} />
            <input type="text" aria-label="A short note" maxLength={80} value={description} placeholder="Say something nice (optional)" onChange={(event) => setDescription(event.target.value)} />
            <button type="button" className={`scoop-btn ${isPublic ? "tone-mint" : "tone-cream"}`} aria-pressed={isPublic} onClick={() => setIsPublic((value) => !value)}>
              {isPublic ? "Sharing with the community" : "Share with the Scoop Community"}
            </button>
            <button type="button" className="scoop-btn tone-pink size-xl" data-testid="save-recipe" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : editingId ? "Save changes" : inspiredBy ? "Save as my own recipe" : "Save to my scoop book"}
            </button>
            <button type="button" className="scoop-btn tone-cream" onClick={() => setPhase("play")}>Keep scooping</button>
          </div>
        </div>
      )}
      {phase === "party" && result && (
        <div className="sheet" role="dialog" aria-label="Your finished scoop">
          <div className="sheet-card">
            {currentBeat === "secret" && (
              <>
                <h2>New recipe discovered!</h2>
                {result.rewards.discoveries.map((secret) => (
                  <p key={secret.id} style={{ margin: 0, fontSize: "1.3rem" }}>{secret.emoji} {secret.name}<br />{secret.description}</p>
                ))}
              </>
            )}
            {currentBeat === "avatars" && (
              <>
                <h2>You won an avatar!</h2>
                {result.rewards.avatars.map((avatar) => (
                  <p key={avatar.id} style={{ margin: 0, fontSize: "1.25rem" }}>
                    <span style={{ fontSize: "3rem", display: "block" }}>{avatar.emoji}</span>
                    {avatar.name}
                    <br />
                    {avatar.blurb}
                  </p>
                ))}
                <p style={{ margin: 0 }}>It&apos;s on your profile. Wear it whenever you like!</p>
              </>
            )}
            {currentBeat === "level" && (
              <>
                <Mascot mood="wow" size={110} />
                <h2>Level {result.rewards.levelAfter}!</h2>
                <p style={{ margin: 0 }}>{result.rewards.unlocked.map((item) => item.name).join(", ") || "The freezer just got bigger."}</p>
              </>
            )}
            {currentBeat === "badges" && (
              <>
                <h2>New badge!</h2>
                {result.rewards.achievements.map((badge) => (
                  <p key={badge.id} style={{ margin: 0 }}>{badge.emoji} {badge.name}<br />{badge.description}</p>
                ))}
              </>
            )}
            {currentBeat === "done" && (
              <>
                <Mascot mood="love" size={110} />
                <h2>That&apos;s scoop-tacular!</h2>
                <div className="reveal-art" style={{ width: 220, height: 300 }}>
                  <IceCreamPreview creation={creation} animate={!calm} />
                </div>
                <strong style={{ fontSize: "1.4rem" }}>{result.recipe.name}</strong>
                <div>+{result.rewards.xp} XP · +{result.rewards.coins} coins</div>
                {result.rewards.eventNote && <div>{result.rewards.eventNote}</div>}
                {result.recipe.inspiredBy && <div>Inspired by {result.recipe.inspiredBy.owner}&apos;s &quot;{result.recipe.inspiredBy.name}&quot;</div>}
                <button type="button" className="scoop-btn tone-pink" onClick={another}>Make another</button>
                <button type="button" className="scoop-btn tone-blue" onClick={onBook}>My scoop book</button>
              </>
            )}
            {currentBeat !== "done" && (
              <button type="button" className="scoop-btn tone-pink" onClick={() => {
                const next = beat + 1;
                setBeat(next);
                if (beats[next] === "level") fx.levelup();
                if (beats[next] === "badges" || beats[next] === "avatars") fx.unlocked();
                if (beats[next] === "secret" || beats[next] === "avatars") void burst(calm);
              }}>Yay!</button>
            )}
          </div>
        </div>
      )}
      {resetAsk && (
        <div className="sheet" role="dialog" aria-label="Start over">
          <div className="sheet-card">
            <Mascot size={96} />
            <h2>Melt this scoop?</h2>
            <button type="button" className="scoop-btn tone-pink" onClick={() => {
              setHistory({ past: [], present: { mix: "single", flavorIds: [], toppingIds: [], sauceIds: [], extraIds: [] }, future: [] });
              setEditingId(null);
              setInspiredBy(null);
              setName("");
              setResetAsk(false);
              setBanner("A fresh start!");
              if (session) clearDraft(session.user.id);
            }}>Yes, start over</button>
            <button type="button" className="scoop-btn tone-cream" onClick={() => setResetAsk(false)}>Keep scooping</button>
          </div>
        </div>
      )}
    </div>
  );
}

const TOUR = [
  "Pick a cone or a cup.",
  "Tap a flavor. It plops onto the scoop!",
  "Add another flavor if you want a taller stack.",
  "Rain on some toppings.",
  "Drizzle a sauce.",
  "Press Finish, give it a name, and save it in your book.",
];

function Line({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <li>
      <span>{label}</span>
      {onRemove && (
        <button type="button" className="scoop-btn tone-cream" style={{ minHeight: 36, padding: "4px 10px" }} onClick={onRemove} aria-label={`Remove ${label}`}>
          ✕
        </button>
      )}
    </li>
  );
}

function IngredientButton({ emoji, name, selected, locked, level, drag, onClick }: { emoji: string; name: string; selected: boolean; locked: boolean; level: number; drag: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`ing-card ${selected ? "is-on" : ""} ${locked ? "is-locked" : ""}`}
      aria-pressed={selected}
      aria-label={locked ? `${name}, locked until level ${level}` : name}
      draggable={!locked}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", drag);
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => {
        fx.unlock();
        onClick();
      }}
    >
      <span className="emoji" aria-hidden>{emoji}</span>
      <span className="label">{name}</span>
      {locked && <span className="lock">Level {level}</span>}
    </button>
  );
}

function SprinkleRain() {
  const colors = ["#ff6fa5", "#7ad7ff", "#ffb15a", "#7debb5", "#c084fc", "#ffe66d"];
  return (
    <div className="rain" aria-hidden>
      {colors.concat(colors, colors).map((color, index) => (
        <i key={index} style={{ left: `${(index * 13) % 100}%`, animationDelay: `${(index % 6) * 0.06}s`, background: color }} />
      ))}
    </div>
  );
}

async function burst(calm: boolean): Promise<void> {
  if (calm) return;
  const confetti = (await import("canvas-confetti")).default;
  void confetti({ particleCount: 90, spread: 72, origin: { y: 0.62 }, colors: ["#ff6fa5", "#7ad7ff", "#fff6e8", "#7debb5", "#ffb15a", "#c084fc"] });
}
