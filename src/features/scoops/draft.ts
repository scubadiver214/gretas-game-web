import type { CurrentCreation, Inspiration } from "./types";
import { EMPTY_CREATION, creationHasProgress } from "./types";

const KEY = (userId: string) => `gretas-game:scoops-draft:v1:${userId}`;

export interface ScoopDraft {
  creation: CurrentCreation;
  name: string;
  description: string;
  isPublic: boolean;
  editingId: string | null;
  inspiredBy: Inspiration | null;
  savedAt: string;
}

export function emptyDraft(): ScoopDraft {
  return {
    creation: EMPTY_CREATION,
    name: "",
    description: "",
    isPublic: false,
    editingId: null,
    inspiredBy: null,
    savedAt: new Date().toISOString(),
  };
}

export function loadDraft(userId: string): ScoopDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScoopDraft;
    if (!parsed?.creation || !Array.isArray(parsed.creation.flavorIds)) return null;
    return parsed;
  } catch (err) {
    console.error("[scoops] draft unreadable", err);
    return null;
  }
}

export function saveDraft(userId: string, draft: ScoopDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(userId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch (err) {
    console.error("[scoops] draft not saved", err);
  }
}

export function clearDraft(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY(userId));
}

export function draftHasProgress(draft: ScoopDraft | null): boolean {
  return Boolean(draft && creationHasProgress(draft.creation));
}
