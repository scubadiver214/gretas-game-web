import { catalog } from "../game-data/catalog";
import type { CurrentCreation, SecretRecipe } from "../types";

function hasAll(have: readonly string[], need: readonly string[]): boolean {
  return need.every((id) => have.includes(id));
}

export function secretMatches(secret: SecretRecipe, creation: CurrentCreation): boolean {
  if (secret.containerId && creation.containerId !== secret.containerId) return false;
  return (
    hasAll(creation.flavorIds, secret.flavors) &&
    hasAll(creation.toppingIds, secret.toppings) &&
    hasAll(creation.sauceIds, secret.sauces) &&
    hasAll(creation.extraIds, secret.extras)
  );
}

export function matchingSecrets(creation: CurrentCreation): SecretRecipe[] {
  return catalog.secrets.filter((secret) => secretMatches(secret, creation));
}
