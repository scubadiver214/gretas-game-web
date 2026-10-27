"use client";

import { useState } from "react";
import { fx } from "@/lib/fx";
import { ScoopProblem } from "../api/client";
import { DROPPED_SCOOP } from "../config";
import { emptyDraft, type ScoopDraft } from "../draft";
import { creationFromRecipe } from "../types";
import type { IceCreamRecipe } from "../types";
import { useScoops } from "../ScoopsProvider";
import { RecipeCard } from "./RecipeCard";

interface BookProps {
  onMake: (draft: ScoopDraft) => void;
}

export function BookScreen({ onMake }: BookProps) {
  const { session, removeRecipe, toggleFavorite, saveRecipe } = useScoops();
  const [toss, setToss] = useState<IceCreamRecipe | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const recipes = session?.recipes ?? [];

  const share = async (recipe: IceCreamRecipe) => {
    try {
      await saveRecipe(
        {
          name: recipe.name,
          description: recipe.description,
          isPublic: !recipe.isPublic,
          containerId: recipe.containerId,
          mix: recipe.mix,
          flavorIds: recipe.scoops.map((scoop) => scoop.flavorId),
          toppingIds: recipe.toppings.map((topping) => topping.toppingId),
          sauceIds: recipe.sauces.map((sauce) => sauce.sauceId),
          extraIds: recipe.extras.map((extra) => extra.extraId),
          inspiredByRecipeId: recipe.inspiredBy?.recipeId,
        },
        recipe.id,
      );
      fx.good();
      setNote(recipe.isPublic ? "Tucked back into your private book." : "Shared with the Scoop Community!");
    } catch (err) {
      setNote(err instanceof ScoopProblem ? err.message : DROPPED_SCOOP);
    }
  };

  if (!session) return null;
  return (
    <div>
      {note && <p className="speech" style={{ margin: "8px 12px" }}>{note}</p>}
      {recipes.length === 0 ? (
        <div className="home">
          <h2>Your book is hungry!</h2>
          <p>Make an ice cream and it will land right here.</p>
        </div>
      ) : (
        <div className="cards">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              mine
              favorite={session.favoriteIds.includes(recipe.id)}
              canCopy={false}
              onMake={() => onMake({ ...emptyDraft(), creation: creationFromRecipe(recipe), name: recipe.name, description: recipe.description ?? "", isPublic: recipe.isPublic, editingId: recipe.id, inspiredBy: recipe.inspiredBy ?? null, savedAt: new Date().toISOString() })}
              onFavorite={() => void toggleFavorite(recipe.id)}
              onEdit={() => onMake({ ...emptyDraft(), creation: creationFromRecipe(recipe), name: recipe.name, description: recipe.description ?? "", isPublic: recipe.isPublic, editingId: recipe.id, inspiredBy: recipe.inspiredBy ?? null, savedAt: new Date().toISOString() })}
              onDelete={() => setToss(recipe)}
              onShare={() => void share(recipe)}
            />
          ))}
        </div>
      )}
      {toss && (
        <div className="sheet" role="dialog" aria-label="Toss recipe">
          <div className="sheet-card">
            <h2>Toss {toss.name}?</h2>
            <button type="button" className="scoop-btn tone-pink" onClick={() => { void removeRecipe(toss.id).then(() => setToss(null)); }}>Yes, toss it</button>
            <button type="button" className="scoop-btn tone-cream" onClick={() => setToss(null)}>Keep it</button>
          </div>
        </div>
      )}
    </div>
  );
}
