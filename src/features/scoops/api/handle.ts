import { DROPPED_SCOOP } from "../config";
import { catalog } from "../game-data/catalog";
import type { RecipeSort } from "../types";
import { ScoopsRuleError } from "../data/errors";
import type { MemoryRepository } from "../data/memoryRepository";

export interface ScoopsHttpRequest {
  method: string;
  /** Segments after `/api/scoops`. */
  path: string[];
  player: string | null;
  body: unknown;
  query: Record<string, string | undefined>;
}

export interface ScoopsHttpResponse {
  status: number;
  body: unknown;
}

const SORTS = new Set<RecipeSort>(["newest", "popular", "made", "favorited", "weird", "colorful", "shelby"]);

function sortOf(value: string | undefined): RecipeSort {
  return value && SORTS.has(value as RecipeSort) ? (value as RecipeSort) : "newest";
}

function signedOut(): ScoopsHttpResponse {
  return { status: 401, body: { message: "Sign in with your nickname first!" } };
}

/**
 * Shop API without Next types, so tests can call it directly.
 * Expected rule errors stay kid-friendly. Anything else is logged and hidden.
 */
export function handleScoops(repo: MemoryRepository, req: ScoopsHttpRequest): ScoopsHttpResponse {
  try {
    if (!req.player?.trim()) return signedOut();
    const [a, b, c] = req.path;
    const method = req.method.toUpperCase();
    const player = req.player;

    if (method === "GET" && a === "me" && !b) return { status: 200, body: repo.ensureUser(player) };
    if (method === "POST" && a === "me" && !b) {
      const body = (req.body ?? {}) as { avatar?: string; tutorialSeen?: boolean };
      return { status: 200, body: repo.updateProfile(player, { avatar: body.avatar, tutorialSeen: body.tutorialSeen }) };
    }
    if (method === "GET" && a === "flavors" && !b) return { status: 200, body: catalog.flavors };
    if (method === "GET" && a === "toppings" && !b) return { status: 200, body: catalog.toppings };
    if (method === "GET" && a === "sauces" && !b) return { status: 200, body: catalog.sauces };
    if (method === "GET" && a === "extras" && !b) return { status: 200, body: catalog.extras };
    if (method === "GET" && a === "containers" && !b) return { status: 200, body: catalog.containers };

    if (a === "recipes" && !b && method === "GET") {
      const scope = req.query.scope === "mine" ? "mine" : "community";
      return { status: 200, body: { recipes: repo.listRecipes(player, scope, sortOf(req.query.sort)) } };
    }
    if (a === "recipes" && !b && method === "POST") return { status: 201, body: repo.createRecipe(player, req.body) };
    if (a === "recipes" && b && !c && method === "GET") return { status: 200, body: repo.getRecipe(player, b) };
    if (a === "recipes" && b && !c && method === "PUT") return { status: 200, body: repo.updateRecipe(player, b, req.body) };
    if (a === "recipes" && b && !c && method === "DELETE") return { status: 200, body: repo.deleteRecipe(player, b) };
    if (a === "recipes" && b && c === "favorite" && method === "POST") return { status: 200, body: repo.favorite(player, b) };
    if (a === "recipes" && b && c === "make" && method === "POST") return { status: 200, body: repo.make(player, b) };
    if (a === "recipes" && b && c === "clone" && method === "POST") {
      const name = req.body && typeof req.body === "object" && "name" in req.body ? String((req.body as { name?: unknown }).name ?? "") : undefined;
      return { status: 201, body: repo.clone(player, b, name) };
    }
    if (a === "users" && b && c === "recipes" && method === "GET") return { status: 200, body: { recipes: repo.listUserRecipes(player, b) } };
    if (a === "users" && b && c === "achievements" && method === "GET") return { status: 200, body: { achievements: repo.listAchievements(player, b) } };
    if (a === "users" && b && c === "unlocks" && method === "GET") return { status: 200, body: repo.listUnlocks(player, b) };

    return { status: 404, body: { message: "Shelby can't find that." } };
  } catch (err) {
    if (err instanceof ScoopsRuleError) return { status: err.status, body: { message: err.kidMessage } };
    console.error("[scoops]", err);
    return { status: 500, body: { message: DROPPED_SCOOP } };
  }
}
