"use client";

import { useMemo, useState } from "react";
import { fx } from "@/lib/fx";
import { ScoopProblem } from "../api/client";
import { DROPPED_SCOOP } from "../config";
import { emptyDraft, type ScoopDraft } from "../draft";
import { sortRecipes } from "../logic/rank";
import { creationFromRecipe, type RecipeSort } from "../types";
import { useScoops } from "../ScoopsProvider";
import { recipeIsOpen, RecipeCard } from "./RecipeCard";

const FILTERS: { id: RecipeSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Most popular" },
  { id: "made", label: "Most made" },
  { id: "favorited", label: "Most favorited" },
  { id: "weird", label: "Weirdest" },
  { id: "colorful", label: "Most colorful" },
  { id: "shelby", label: "Shelby's favorites" },
];

export function CommunityScreen({ onMake }: { onMake: (draft: ScoopDraft) => void }) {
  const { session, community, toggleFavorite, makeRecipe, cloneRecipe } = useScoops();
  const [sort, setSort] = useState<RecipeSort>("newest");
  const [note, setNote] = useState<string | null>(null);
  const recipes = useMemo(() => sortRecipes(community, sort), [community, sort]);
  if (!session) return null;

  return (
    <div>
      <div className="filters" role="toolbar" aria-label="Recipe filters">
        {FILTERS.map((filter) => (
          <button key={filter.id} type="button" className={`scoop-btn ${sort === filter.id ? "tone-pink" : "tone-cream"}`} aria-pressed={sort === filter.id} onClick={() => setSort(filter.id)}>
            {filter.label}
          </button>
        ))}
      </div>
      {note && <p className="speech" style={{ margin: "0 12px 8px" }}>{note}</p>}
      <div className="cards">
        {recipes.map((recipe) => {
          const mine = recipe.ownerUserId === session.user.id;
          const canCopy = !mine && recipeIsOpen(recipe, session.user.level, session.unlocks);
          return (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              mine={mine}
              favorite={session.favoriteIds.includes(recipe.id)}
              canCopy={canCopy}
              onFavorite={() => void toggleFavorite(recipe.id)}
              onMake={() => {
                fx.pop();
                void makeRecipe(recipe.id).then((made) => {
                  if (made.note) setNote(made.note);
                });
                onMake({
                  ...emptyDraft(),
                  creation: creationFromRecipe(recipe),
                  name: mine ? recipe.name : "",
                  description: recipe.description ?? "",
                  isPublic: false,
                  editingId: mine ? recipe.id : null,
                  inspiredBy: mine ? recipe.inspiredBy ?? null : { recipeId: recipe.id, name: recipe.name, owner: recipe.ownerName },
                  savedAt: new Date().toISOString(),
                });
              }}
              onCopy={() => {
                void cloneRecipe(recipe.id)
                  .then(() => {
                    fx.good();
                    setNote(`Saved a copy of ${recipe.name}. It's in your book.`);
                  })
                  .catch((err: unknown) => setNote(err instanceof ScoopProblem ? err.message : DROPPED_SCOOP));
              }}
            />
          );
        })}
      </div>
      {recipes.length === 0 && <p style={{ textAlign: "center" }}>No scoops in this filter yet.</p>}
    </div>
  );
}
