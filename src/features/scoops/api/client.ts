import { DROPPED_SCOOP } from "../config";
import type { FavoriteResult, IceCreamRecipe, MakeResult, ProfilePatch, SaveRecipeInput, SaveResult, ScoopSession } from "../types";

export class ScoopProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoopProblem";
  }
}

async function call<T>(nickname: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/scoops/${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "content-type": "application/json",
        "x-scoops-player": nickname,
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[scoops] network", path, err);
    throw new ScoopProblem(DROPPED_SCOOP);
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[scoops]", path, response.status, body);
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : DROPPED_SCOOP;
    throw new ScoopProblem(message);
  }
  return body as T;
}

export const scoopsApi = {
  me: (nickname: string) => call<ScoopSession>(nickname, "me"),
  community: (nickname: string) => call<{ recipes: IceCreamRecipe[] }>(nickname, "recipes?scope=community&sort=newest"),
  save: (nickname: string, input: SaveRecipeInput, editingId?: string | null) =>
    editingId
      ? call<SaveResult>(nickname, `recipes/${encodeURIComponent(editingId)}`, { method: "PUT", body: input })
      : call<SaveResult>(nickname, "recipes", { method: "POST", body: input }),
  remove: (nickname: string, id: string) => call<ScoopSession>(nickname, `recipes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  favorite: (nickname: string, id: string) => call<FavoriteResult>(nickname, `recipes/${encodeURIComponent(id)}/favorite`, { method: "POST", body: {} }),
  make: (nickname: string, id: string) => call<MakeResult>(nickname, `recipes/${encodeURIComponent(id)}/make`, { method: "POST", body: {} }),
  clone: (nickname: string, id: string) => call<SaveResult>(nickname, `recipes/${encodeURIComponent(id)}/clone`, { method: "POST", body: {} }),
  profile: (nickname: string, patch: ProfilePatch) => call<ScoopSession>(nickname, "me", { method: "POST", body: patch }),
};
