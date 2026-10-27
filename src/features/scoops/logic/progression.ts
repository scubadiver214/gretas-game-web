import { levelForXp } from "../config";
import { allUnlockables, catalog, findIngredient } from "../game-data/catalog";
import type { AchievementDef, CurrentCreation, ShopEvent, UnlockKind } from "../types";
import { matchingSecrets } from "./secrets";

export interface ScoreResult {
  xp: number;
  coins: number;
  eventNote: string | null;
  eventCompleted: boolean;
}

function includesAll(have: readonly string[], need: readonly string[] | undefined): boolean {
  if (!need || need.length === 0) return true;
  return need.every((id) => have.includes(id));
}

export function eventSatisfied(event: ShopEvent, creation: CurrentCreation): boolean {
  if (event.kind === "double-xp") return true;
  if (event.kind === "mystery") return Boolean(event.flavorId && creation.flavorIds.includes(event.flavorId));
  return (
    includesAll(creation.flavorIds, event.flavorIds) &&
    includesAll(creation.toppingIds, event.toppingIds) &&
    includesAll(creation.sauceIds, event.sauceIds) &&
    includesAll(creation.extraIds, event.extraIds)
  );
}

/** XP and coins for one save. `freshSecrets` are discoveries the player does not already have. */
export function scoreCreation(
  creation: CurrentCreation,
  mode: "create" | "edit",
  freshSecretIds: readonly string[],
  event: ShopEvent | null,
): ScoreResult {
  const fresh = catalog.secrets.filter((secret) => freshSecretIds.includes(secret.id));
  const secretXp = fresh.reduce((sum, secret) => sum + secret.bonusXp, 0);
  const secretCoins = fresh.reduce((sum, secret) => sum + secret.bonusCoins, 0);
  let xp = mode === "create"
    ? 25 + creation.flavorIds.length * 8 + creation.toppingIds.length * 4 + creation.sauceIds.length * 6 + creation.extraIds.length * 8
    : 8;
  xp += secretXp;
  let coins = secretCoins;
  let eventNote: string | null = null;
  let eventCompleted = false;
  if (event && mode === "create" && event.kind === "double-xp") {
    xp *= 2;
    eventNote = "Double Scoop Day doubled your XP!";
  } else if (event && !event.completed && event.kind === "mystery" && eventSatisfied(event, creation)) {
    xp += 30;
    coins += 20;
    eventNote = "You used the mystery flavor!";
    eventCompleted = true;
  } else if (event && !event.completed && event.kind === "challenge" && eventSatisfied(event, creation)) {
    xp += 20;
    coins += 40;
    eventNote = "You finished Shelby's challenge!";
    eventCompleted = true;
  }
  coins += Math.round(xp * 0.5);
  return { xp, coins, eventNote, eventCompleted };
}

export function fruitCount(creation: CurrentCreation): number {
  const ids = [...creation.flavorIds, ...creation.toppingIds, ...creation.sauceIds, ...creation.extraIds];
  let count = 0;
  for (const id of ids) {
    const found = findIngredient(id);
    const tags = found && "tags" in found.item ? found.item.tags : undefined;
    if (tags?.includes("fruit")) count += 1;
  }
  return count;
}

export function chocolateOverload(creation: CurrentCreation): boolean {
  const chocolate = creation.flavorIds.includes("chocolate");
  const fudge = creation.flavorIds.includes("fudge") || creation.sauceIds.includes("hot-fudge");
  const chips = creation.toppingIds.includes("chocolate-chips");
  return chocolate && fudge && chips;
}

export interface AchievementInput {
  recipesCreated: number;
  recipeStar: boolean;
  discoveries: readonly string[];
  creation: CurrentCreation | null;
  already: readonly string[];
}

export function evaluateAchievements(input: AchievementInput): AchievementDef[] {
  const earned = new Set<string>();
  const { creation } = input;
  if (input.recipesCreated >= 1) earned.add("first-scoop");
  if (input.recipesCreated >= 10) earned.add("scoop-scientist");
  if (input.recipesCreated >= 25) earned.add("master-scooper");
  if (input.recipeStar) earned.add("recipe-star");
  if (input.discoveries.includes("shelbys-favorite")) earned.add("shelbys-favorite");
  if (creation) {
    if (creation.flavorIds.length >= 2) earned.add("double-trouble");
    if (creation.flavorIds.length >= 3) earned.add("triple-scoop");
    if (creation.flavorIds.includes("superman") && creation.flavorIds.includes("blue-moon")) earned.add("rainbow-power");
    if (chocolateOverload(creation)) earned.add("chocolate-overload");
    if (fruitCount(creation) >= 3) earned.add("fruit-explosion");
  }
  const have = new Set(input.already);
  return catalog.achievements.filter((badge) => earned.has(badge.id) && !have.has(badge.id));
}

export interface UnlockGrant {
  kind: UnlockKind;
  id: string;
  name: string;
}

export function unlocksBetween(previousLevel: number, nextLevel: number, already: ReadonlySet<string>): UnlockGrant[] {
  if (nextLevel <= previousLevel) return [];
  const grants: UnlockGrant[] = [];
  for (const { kind, item } of allUnlockables()) {
    const wasOpen = item.unlockedByDefault || previousLevel >= item.unlockLevel || already.has(item.id);
    const nowOpen = item.unlockedByDefault || nextLevel >= item.unlockLevel;
    if (!wasOpen && nowOpen) grants.push({ kind, id: item.id, name: item.name });
  }
  return grants;
}

export function previewSecrets(creation: CurrentCreation, known: readonly string[]): string[] {
  const have = new Set(known);
  return matchingSecrets(creation)
    .map((secret) => secret.id)
    .filter((id) => !have.has(id));
}

export function totalLevel(xp: number, gain: number): { before: number; after: number } {
  return { before: levelForXp(xp), after: levelForXp(xp + gain) };
}
