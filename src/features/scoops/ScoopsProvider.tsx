"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ScoopProblem, scoopsApi } from "./api/client";
import { DROPPED_SCOOP } from "./config";
import type { IceCreamRecipe, MakeResult, SaveRecipeInput, SaveResult, ScoopSession } from "./types";

interface ScoopsContextValue {
  nickname: string;
  status: "loading" | "ready" | "error";
  error: string | null;
  session: ScoopSession | null;
  community: IceCreamRecipe[];
  reload: () => Promise<void>;
  saveRecipe: (input: SaveRecipeInput, editingId?: string | null) => Promise<SaveResult>;
  removeRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  makeRecipe: (id: string) => Promise<MakeResult>;
  cloneRecipe: (id: string) => Promise<SaveResult>;
  setAvatar: (id: string) => Promise<void>;
  setTutorialSeen: (seen: boolean) => Promise<void>;
}

const ScoopsContext = createContext<ScoopsContextValue | null>(null);

function upsertCommunity(list: IceCreamRecipe[], recipe: IceCreamRecipe): IceCreamRecipe[] {
  const rest = list.filter((item) => item.id !== recipe.id);
  return recipe.isPublic ? [recipe, ...rest] : rest;
}

export function ScoopsProvider({ nickname, children }: { nickname: string; children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ScoopSession | null>(null);
  const [community, setCommunity] = useState<IceCreamRecipe[]>([]);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [me, board] = await Promise.all([scoopsApi.me(nickname), scoopsApi.community(nickname)]);
      setSession(me);
      setCommunity(board.recipes);
      setStatus("ready");
    } catch (err) {
      console.error("[scoops] shop closed", err);
      setError(err instanceof ScoopProblem ? err.message : DROPPED_SCOOP);
      setStatus("error");
    }
  }, [nickname]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const [me, board] = await Promise.all([scoopsApi.me(nickname), scoopsApi.community(nickname)]);
        if (cancel) return;
        setSession(me);
        setCommunity(board.recipes);
        setStatus("ready");
      } catch (err) {
        console.error("[scoops] shop closed", err);
        if (cancel) return;
        setError(err instanceof ScoopProblem ? err.message : DROPPED_SCOOP);
        setStatus("error");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [nickname]);

  const saveRecipe = useCallback(
    async (input: SaveRecipeInput, editingId?: string | null) => {
      const result = await scoopsApi.save(nickname, input, editingId);
      setSession(result.session);
      setCommunity((list) => upsertCommunity(list, result.recipe));
      return result;
    },
    [nickname],
  );

  const removeRecipe = useCallback(
    async (id: string) => {
      const next = await scoopsApi.remove(nickname, id);
      setSession(next);
      setCommunity((list) => list.filter((recipe) => recipe.id !== id));
    },
    [nickname],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const result = await scoopsApi.favorite(nickname, id);
      setSession(result.session);
      setCommunity((list) => list.map((recipe) => (recipe.id === id ? result.recipe : recipe)));
    },
    [nickname],
  );

  const makeRecipe = useCallback(
    async (id: string) => {
      const result = await scoopsApi.make(nickname, id);
      setSession(result.session);
      setCommunity((list) => list.map((recipe) => (recipe.id === id ? result.recipe : recipe)));
      return result;
    },
    [nickname],
  );

  const cloneRecipe = useCallback(
    async (id: string) => {
      const result = await scoopsApi.clone(nickname, id);
      setSession(result.session);
      setCommunity((list) => upsertCommunity(list, result.recipe));
      return result;
    },
    [nickname],
  );

  const setAvatar = useCallback(
    async (id: string) => {
      setSession(await scoopsApi.profile(nickname, { avatar: id }));
    },
    [nickname],
  );

  const setTutorialSeen = useCallback(
    async (seen: boolean) => {
      setSession(await scoopsApi.profile(nickname, { tutorialSeen: seen }));
    },
    [nickname],
  );

  const value = useMemo<ScoopsContextValue>(
    () => ({
      nickname,
      status,
      error,
      session,
      community,
      reload,
      saveRecipe,
      removeRecipe,
      toggleFavorite,
      makeRecipe,
      cloneRecipe,
      setAvatar,
      setTutorialSeen,
    }),
    [nickname, status, error, session, community, reload, saveRecipe, removeRecipe, toggleFavorite, makeRecipe, cloneRecipe, setAvatar, setTutorialSeen],
  );

  return <ScoopsContext.Provider value={value}>{children}</ScoopsContext.Provider>;
}

export function useScoops(): ScoopsContextValue {
  const value = useContext(ScoopsContext);
  if (!value) throw new Error("useScoops outside the shop");
  return value;
}
