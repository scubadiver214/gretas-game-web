import { ACHIEVEMENTS } from "./achievements";
import { AVATARS } from "./avatars";
import { CONTAINERS } from "./containers";
import { EXTRAS } from "./extras";
import { FLAVORS } from "./flavors";
import { SAUCES } from "./sauces";
import { SECRET_RECIPES } from "./secretRecipes";
import { TOPPINGS } from "./toppings";
import type { AvatarDef, Container, Extra, Flavor, Sauce, Topping, UnlockKind, UnlockRule } from "../types";

function indexBy<T extends { id: string }>(rows: readonly T[]): ReadonlyMap<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

export const catalog = {
  flavors: FLAVORS,
  containers: CONTAINERS,
  toppings: TOPPINGS,
  sauces: SAUCES,
  extras: EXTRAS,
  secrets: SECRET_RECIPES,
  achievements: ACHIEVEMENTS,
  avatars: AVATARS,
  flavorById: indexBy(FLAVORS),
  containerById: indexBy(CONTAINERS),
  toppingById: indexBy(TOPPINGS),
  sauceById: indexBy(SAUCES),
  extraById: indexBy(EXTRAS),
  secretById: indexBy(SECRET_RECIPES),
  achievementById: indexBy(ACHIEVEMENTS),
  avatarById: indexBy(AVATARS),
};

export interface TaggedItem extends UnlockRule {
  id: string;
  name: string;
  tags?: readonly string[];
}

export function isAvailable(item: UnlockRule & { id: string }, level: number, explicit?: ReadonlySet<string>): boolean {
  if (item.unlockedByDefault || level >= item.unlockLevel) return true;
  return explicit?.has(item.id) ?? false;
}

export function itemsForKind(kind: UnlockKind): readonly (TaggedItem & { kind: UnlockKind })[] {
  const tag = <T extends TaggedItem>(rows: readonly T[], k: UnlockKind) => rows.map((row) => ({ ...row, kind: k }));
  switch (kind) {
    case "flavor":
      return tag(FLAVORS, kind);
    case "container":
      return tag(CONTAINERS, kind);
    case "topping":
      return tag(TOPPINGS, kind);
    case "sauce":
      return tag(SAUCES, kind);
    case "extra":
      return tag(EXTRAS, kind);
    case "avatar":
      return tag(AVATARS, kind);
    default:
      return [];
  }
}

const KINDS: readonly UnlockKind[] = ["flavor", "container", "topping", "sauce", "extra", "avatar"];

export function allUnlockables(): readonly { kind: UnlockKind; item: TaggedItem }[] {
  return KINDS.flatMap((kind) => itemsForKind(kind).map((item) => ({ kind, item })));
}

export function findIngredient(id: string): { kind: Exclude<UnlockKind, "avatar">; item: Flavor | Container | Topping | Sauce | Extra } | null {
  const flavor = catalog.flavorById.get(id);
  if (flavor) return { kind: "flavor", item: flavor };
  const container = catalog.containerById.get(id);
  if (container) return { kind: "container", item: container };
  const topping = catalog.toppingById.get(id);
  if (topping) return { kind: "topping", item: topping };
  const sauce = catalog.sauceById.get(id);
  if (sauce) return { kind: "sauce", item: sauce };
  const extra = catalog.extraById.get(id);
  if (extra) return { kind: "extra", item: extra };
  return null;
}

export function avatarById(id: string): AvatarDef | undefined {
  return catalog.avatarById.get(id);
}
