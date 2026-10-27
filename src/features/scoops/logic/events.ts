import { dailyKey, hashString } from "@/lib/rng";
import { catalog } from "../game-data/catalog";
import type { ShopEvent } from "../types";

export interface EventUnlocks {
  flavors: readonly string[];
  sauces: readonly string[];
}

function doubleXp(date: string, completed: boolean): ShopEvent {
  return {
    id: "double-xp",
    kind: "double-xp",
    title: "DOUBLE SCOOP DAY!",
    detail: "Every new scoop earns double XP today.",
    date,
    completed,
  };
}

/** Same player, same day, same event. Refresh does not reroll it. */
export function eventForUser(date: string, userId: string, unlocks: EventUnlocks, completedIds: readonly string[]): ShopEvent | null {
  const roll = hashString(`${date}:${userId}`) % 5;
  if (roll === 3 || roll === 4) return null;
  if (roll === 0) return doubleXp(date, false);
  if (roll === 1) {
    const pool = unlocks.flavors.filter((id) => catalog.flavorById.get(id)?.unlockedByDefault);
    const choices = pool.length > 0 ? pool : ["vanilla"];
    const flavorId = choices[hashString(`${date}:${userId}:flavor`) % choices.length] ?? "vanilla";
    const name = catalog.flavorById.get(flavorId)?.name ?? "Vanilla";
    return {
      id: "mystery",
      kind: "mystery",
      title: "MYSTERY FLAVOR!",
      detail: `Make a scoop with ${name}.`,
      date,
      completed: completedIds.includes("mystery"),
      flavorId,
    };
  }
  const ready = unlocks.flavors.includes("blue-moon") && unlocks.flavors.includes("strawberry") && unlocks.sauces.includes("hot-fudge");
  if (!ready) return doubleXp(date, false);
  return {
    id: "challenge",
    kind: "challenge",
    title: "SHELBY'S CHALLENGE",
    detail: "Make something with Blue Moon, Strawberry, and Hot Fudge.",
    date,
    completed: completedIds.includes("challenge"),
    flavorIds: ["blue-moon", "strawberry"],
    sauceIds: ["hot-fudge"],
    toppingIds: [],
    extraIds: [],
  };
}

export function todayKey(now: Date = new Date()): string {
  return dailyKey(now);
}
