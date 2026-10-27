import { catalog } from "../game-data/catalog";
import type { AvatarDef, CurrentCreation } from "../types";
import { chocolateOverload, fruitCount } from "./progression";
import { matchingSecrets } from "./secrets";

export interface PrizeCheck {
  creation: CurrentCreation;
  /** How many recipes this player has saved, including the one just saved. */
  recipesCreated: number;
}

function has(ids: readonly string[], id: string): boolean {
  return ids.includes(id);
}

/** Avatars won by this saved scoop that the player does not already own. */
export function avatarPrizesEarned(check: PrizeCheck, already: ReadonlySet<string>): AvatarDef[] {
  const { creation } = check;
  const serve = creation.containerId ? catalog.containerById.get(creation.containerId)?.serve : undefined;
  const secrets = new Set(matchingSecrets(creation).map((secret) => secret.id));
  const won = new Set<string>();

  if (check.recipesCreated >= 1) won.add("sprinkle-pal");
  if (serve === "cone") won.add("cone-kid");
  if (serve === "cup") won.add("cup-kid");
  if (has(creation.extraIds, "cherry")) won.add("cherry-champ");
  if (creation.flavorIds.length >= 2) won.add("double-buddy");
  if (creation.flavorIds.length >= 3) won.add("tower-champ");
  if (has(creation.toppingIds, "rainbow-sprinkles")) won.add("rainbow-rider");
  if (chocolateOverload(creation)) won.add("cocoa-captain");
  if (fruitCount(creation) >= 3) won.add("fruit-friend");
  if (creation.mix === "swirl") won.add("swirl-star");
  if (creation.mix === "crazy") won.add("silly-scoop");
  if (creation.toppingIds.length > 0 && creation.sauceIds.length > 0 && creation.extraIds.length > 0) won.add("fancy-finish");
  if ((creation.containerId === "waffle-cone" || creation.containerId === "chocolate-waffle") && creation.flavorIds.length >= 3 && creation.sauceIds.length > 0) {
    won.add("waffle-wizard");
  }
  if (has(creation.toppingIds, "gummy-bears") && has(creation.extraIds, "gummy-worm")) won.add("gummy-guru");
  if (has(creation.flavorIds, "birthday-cake") && has(creation.extraIds, "candle")) won.add("party-pal");
  if (secrets.has("super-moon")) won.add("moon-ranger");
  if (has(creation.flavorIds, "cotton-candy") && has(creation.toppingIds, "rainbow-sprinkles") && (has(creation.extraIds, "rainbow") || has(creation.sauceIds, "rainbow-sauce"))) {
    won.add("unicorn-friend");
  }
  if (check.recipesCreated >= 5) won.add("shop-star");
  if (check.recipesCreated >= 10) won.add("recipe-hero");
  if (secrets.has("shelbys-favorite")) won.add("shelbys-twin");

  return catalog.avatars.filter((avatar) => won.has(avatar.id) && !already.has(avatar.id));
}
