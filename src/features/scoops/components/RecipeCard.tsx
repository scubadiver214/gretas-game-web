"use client";

import { catalog, isAvailable } from "../game-data/catalog";
import { creationFromRecipe } from "../types";
import type { IceCreamRecipe, UnlockSet } from "../types";
import { IceCreamPreview } from "./IceCreamPreview";

function prettyDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function recipeIsOpen(recipe: IceCreamRecipe, level: number, unlocks: UnlockSet): boolean {
  const flavorSet = new Set(unlocks.flavors);
  const checks: boolean[] = [
    isAvailable(catalog.containerById.get(recipe.containerId) ?? { id: recipe.containerId, unlockLevel: 99, unlockedByDefault: false }, level, new Set(unlocks.containers)),
    ...recipe.scoops.map((scoop) => isAvailable(catalog.flavorById.get(scoop.flavorId) ?? { id: scoop.flavorId, unlockLevel: 99, unlockedByDefault: false }, level, flavorSet)),
  ];
  return checks.every(Boolean);
}

interface RecipeCardProps {
  recipe: IceCreamRecipe;
  favorite: boolean;
  mine: boolean;
  canCopy: boolean;
  onMake: () => void;
  onFavorite: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
}

export function RecipeCard({ recipe, favorite, mine, canCopy, onMake, onFavorite, onEdit, onDelete, onCopy, onShare }: RecipeCardProps) {
  const flavors = recipe.scoops.map((scoop) => catalog.flavorById.get(scoop.flavorId)?.emoji ?? "🍦").join(" ");
  return (
    <article className="recipe-card">
      <div className="card-preview">
        <IceCreamPreview creation={creationFromRecipe(recipe)} animate={false} />
      </div>
      <div className="card-body">
        <h3>{recipe.name}</h3>
        <div aria-label="Flavors">{flavors}</div>
        <div>
          {recipe.ownerName} · {prettyDate(recipe.createdAt)}
        </div>
        <div>
          Made {recipe.stats.timesMade} · ❤️ {recipe.stats.favorites}
        </div>
        {recipe.inspiredBy && (
          <div>
            Inspired by {recipe.inspiredBy.owner}&apos;s &quot;{recipe.inspiredBy.name}&quot;
          </div>
        )}
        <div className="card-actions">
          <button type="button" className="scoop-btn tone-pink" onClick={onMake}>
            {mine ? "Make again" : "Make this!"}
          </button>
          <button type="button" className="scoop-btn tone-cream" aria-pressed={favorite} onClick={onFavorite}>
            {favorite ? "Loved" : "Love it"}
          </button>
          {mine && onEdit && (
            <button type="button" className="scoop-btn tone-blue" onClick={onEdit}>
              Edit
            </button>
          )}
          {mine && onShare && (
            <button type="button" className="scoop-btn tone-mint" onClick={onShare}>
              {recipe.isPublic ? "Shared" : "Share"}
            </button>
          )}
          {canCopy && onCopy && (
            <button type="button" className="scoop-btn tone-orange" onClick={onCopy}>
              Save a copy
            </button>
          )}
          {mine && onDelete && (
            <button type="button" className="scoop-btn tone-cream" onClick={onDelete}>
              Toss
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
