import type { CharacterId } from "@/features/player/types";
import { request } from "@/features/scores/api";
import type { WorldId } from "./content/worlds";

/** Client for the claw endpoints (see the API README, "Claw arcade"). */

export interface ClawPrizeEntry {
  prizeId: string;
  count: number;
  favorite: boolean;
  firstCollectedAt: string;
  lastCollectedAt: string;
}

export interface ClawAvatarEntry {
  avatarId: string;
  unlockedAt: string;
}

export interface ClawLevelEntry {
  level: number;
  stars: number;
  bestGrabs: number;
  clears: number;
  lastClearedAt: string;
}

export interface ClawProfile {
  nickname: string;
  currentLevel: number;
  selectedAvatar: string | null;
  points: number;
  totalGrabs: number;
  successfulGrabs: number;
  prizes: ClawPrizeEntry[];
  avatars: ClawAvatarEntry[];
  levels: ClawLevelEntry[];
  mysteryWorldsWon: WorldId[];
}

export interface StartAttemptRequest {
  character: CharacterId;
  color?: string;
  level: number;
  /** World id when playing that world's mystery machine. */
  mystery?: WorldId;
}

export interface StartAttemptResponse {
  attemptId: string;
  startedAt: string;
  level: number;
  kind: "level" | "mystery";
}

export interface RecordGrabRequest {
  nickname: string;
  seq: number;
  prizeId: string | null;
  succeeded: boolean;
  elapsedSeconds: number;
}

export interface RecordGrabResponse {
  succeeded: boolean;
  prizeId: string | null;
  count: number;
  points: number;
  totalPoints: number;
  newAvatars: string[];
}

export interface CompleteAttemptRequest {
  nickname: string;
  durationSeconds: number;
}

export interface CompleteAttemptResponse {
  stars: number;
  cleared: boolean;
  currentLevel: number;
  newAvatars: string[];
  mysteryUnlocked: WorldId | null;
}

const base = "/api/claw";

export function emptyProfile(nickname: string): ClawProfile {
  return { nickname, currentLevel: 1, selectedAvatar: null, points: 0, totalGrabs: 0, successfulGrabs: 0, prizes: [], avatars: [], levels: [], mysteryWorldsWon: [] };
}

export function getProfile(nickname: string): Promise<ClawProfile> {
  return request<ClawProfile>(`${base}/players/${encodeURIComponent(nickname)}/profile`);
}

export function startAttempt(nickname: string, body: StartAttemptRequest): Promise<StartAttemptResponse> {
  return request<StartAttemptResponse>(`${base}/players/${encodeURIComponent(nickname)}/attempts`, { method: "POST", body: JSON.stringify(body) });
}

export function recordGrab(attemptId: string, body: RecordGrabRequest): Promise<RecordGrabResponse> {
  return request<RecordGrabResponse>(`${base}/attempts/${encodeURIComponent(attemptId)}/grabs`, { method: "POST", body: JSON.stringify(body) });
}

export function completeAttempt(attemptId: string, body: CompleteAttemptRequest): Promise<CompleteAttemptResponse> {
  return request<CompleteAttemptResponse>(`${base}/attempts/${encodeURIComponent(attemptId)}/complete`, { method: "POST", body: JSON.stringify(body) });
}

export function selectAvatar(nickname: string, body: { character: CharacterId; color?: string; avatarId: string }): Promise<ClawProfile> {
  return request<ClawProfile>(`${base}/players/${encodeURIComponent(nickname)}/avatar`, { method: "PUT", body: JSON.stringify(body) });
}

export async function setFavorite(nickname: string, prizeId: string, favorite: boolean): Promise<void> {
  const res = await fetch(`${base}/players/${encodeURIComponent(nickname)}/prizes/${encodeURIComponent(prizeId)}/favorite`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorite }),
  });
  if (!res.ok) throw new Error(`Could not update favorite (${res.status})`);
}
