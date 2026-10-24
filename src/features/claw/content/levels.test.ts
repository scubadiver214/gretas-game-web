import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/rng";
import { CLAW } from "../config";
import { MAX_LEVEL } from "../engine/difficulty";
import { grabChance, neighbourCount } from "../engine/grab";
import { isExposed, layoutPile, pickTemplates, pileBoundsFor } from "../engine/pile";
import { AVATARS } from "./avatars";
import { LEVELS, goalFor, levelDef, mysterySetup } from "./levels";
import { PRIZES, PRIZE_BY_ID, TOY_TEMPLATES } from "./prizes";
import { WORLDS, worldFor } from "./worlds";

describe("prize catalog", () => {
  it("has unique ids and sane numbers", () => {
    const ids = new Set(PRIZES.map((p) => p.id));
    expect(ids.size).toBe(PRIZES.length);
    expect(PRIZES.length).toBeGreaterThanOrEqual(45);
    for (const p of PRIZES) {
      expect(p.size).toBeGreaterThan(0.2);
      expect(p.size).toBeLessThan(0.8);
      expect(p.weight).toBeGreaterThanOrEqual(0);
      expect(p.weight).toBeLessThanOrEqual(1);
      expect(p.gripDifficulty).toBeGreaterThanOrEqual(0);
      expect(p.gripDifficulty).toBeLessThanOrEqual(1);
      expect(p.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(p.unlockLevel).toBeLessThanOrEqual(MAX_LEVEL);
      expect(p.points).toBeGreaterThan(0);
      expect(p.palette).toHaveLength(3);
    }
  });

  it("covers every rarity", () => {
    for (const r of ["common", "uncommon", "rare", "legendary"] as const) expect(PRIZES.some((p) => p.rarity === r)).toBe(true);
  });
});

describe("worlds", () => {
  it("tile levels 1-50 without gaps and only reference real prizes and avatars", () => {
    let next = 1;
    for (const w of WORLDS) {
      expect(w.from).toBe(next);
      next = w.to + 1;
      for (const id of w.prizes) expect(PRIZE_BY_ID[id], id).toBeDefined();
      expect(PRIZE_BY_ID[w.mysteryPrize]?.rarity).toBe("legendary");
      expect(PRIZE_BY_ID[w.mysteryPrize]?.mysteryOnly).toBe(true);
      expect(AVATARS.some((a) => a.id === w.avatar)).toBe(true);
    }
    expect(next - 1).toBe(MAX_LEVEL);
    expect(worldFor(1).id).toBe("toybox");
    expect(worldFor(50).id).toBe("rainbow");
  });

  it("puts every collectable prize in a world the player can actually find it in", () => {
    const pooled = new Set(WORLDS.flatMap((w) => [...w.prizes]));
    for (const p of PRIZES) {
      if (p.mysteryOnly) continue;
      expect(pooled.has(p.id), p.id).toBe(true);
      const homes = WORLDS.filter((w) => w.prizes.includes(p.id));
      expect(homes.some((w) => p.unlockLevel <= w.to), `${p.id} unlocks at ${p.unlockLevel}`).toBe(true);
    }
  });
});

describe("levels", () => {
  it("defines 50 levels with goals that only ever grow", () => {
    expect(LEVELS).toHaveLength(MAX_LEVEL);
    let goal = 0;
    for (const l of LEVELS) {
      expect(l.goal).toBeGreaterThanOrEqual(goal);
      goal = l.goal;
      expect(l.toyCount).toBeGreaterThan(l.goal);
      expect(l.pool.length).toBeGreaterThanOrEqual(3);
    }
    expect(goalFor(1)).toBe(1);
    expect(goalFor(10)).toBe(2);
    expect(goalFor(30)).toBe(3);
    expect(goalFor(50)).toBe(4);
  });

  it("only offers prizes that are unlocked by that level", () => {
    for (const l of LEVELS) {
      for (const id of l.pool) {
        const p = PRIZE_BY_ID[id];
        expect(p.unlockLevel, `${id} on level ${l.level}`).toBeLessThanOrEqual(l.level);
        expect(p.mysteryOnly).toBeFalsy();
      }
    }
  });

  it("every level has at least `goal` exposed toys the claw can realistically win, including one easy one", () => {
    for (const l of LEVELS) {
      const rng = seededRng(`solvable:${l.level}`);
      const pool = l.pool.map((id) => TOY_TEMPLATES[id]);
      const toys = layoutPile(rng, pickTemplates(rng, pool, l.toyCount), l.difficulty.crowding, pileBoundsFor(l.depthControl));
      const exposed = toys.filter((t) => isExposed(t, toys));
      const chances = exposed.map((t) => grabChance(t, 0, l.difficulty, neighbourCount(t, toys)));
      const winnable = chances.filter((c) => c >= 0.35);
      expect(winnable.length, `level ${l.level}`).toBeGreaterThanOrEqual(l.goal);
      expect(Math.max(...chances), `level ${l.level} easiest`).toBeGreaterThanOrEqual(0.55);
      expect(Math.max(...toys.map((t) => t.y + t.radius))).toBeLessThanOrEqual(CLAW.maxPileTop + 1e-6);
    }
  });

  it("level 1 is very forgiving", () => {
    const l = levelDef(1);
    const rng = seededRng("gentle");
    const toys = layoutPile(rng, pickTemplates(rng, l.pool.map((id) => TOY_TEMPLATES[id]), l.toyCount), l.difficulty.crowding, pileBoundsFor(l.depthControl));
    for (const t of toys.filter((t) => isExposed(t, toys))) {
      expect(grabChance(t, 0.1, l.difficulty, neighbourCount(t, toys))).toBeGreaterThanOrEqual(0.55);
    }
  });

  it("builds a mystery machine for every world", () => {
    for (const w of WORLDS) {
      const m = mysterySetup(w.id);
      expect(m.mystery).toBe(true);
      expect(m.pool).toEqual([w.mysteryPrize]);
      expect(m.level).toBe(w.to);
      expect(m.difficulty.slipChance).toBe(0);
    }
  });
});
