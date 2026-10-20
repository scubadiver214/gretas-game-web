import type { CharacterId } from "@/features/player/types";
import { request } from "@/features/scores/api";

const GAME = "frogger";

export interface StartSessionRequest {
  nickname: string;
  character: CharacterId;
  color?: string;
  /** UTC date key when playing today's daily challenge. */
  challengeDate?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  startedAt: string;
}

export interface CompleteSessionRequest {
  nickname: string;
  score: number;
  highestLevel: number;
  levelsCompleted: number;
  livesLost: number;
  durationSeconds: number;
}

export interface CompleteSessionResponse {
  rank: number;
  isPersonalBest: boolean;
  /** Best Frogger score before this game, or null on a first game. */
  previousBest: number | null;
}

export interface FroggerStats {
  gamesPlayed: number;
  highestScore: number;
  highestLevel: number;
  totalScore: number;
  lastPlayedAt: string | null;
}

export interface FroggerHistoryEntry {
  sessionId: string;
  score: number;
  highestLevel: number;
  levelsCompleted: number;
  livesLost: number;
  durationSeconds: number;
  challengeDate: string | null;
  completedAt: string;
}

const base = `/api/games/${GAME}`;

export function startSession(body: StartSessionRequest): Promise<StartSessionResponse> {
  return request<StartSessionResponse>(`${base}/sessions`, { method: "POST", body: JSON.stringify(body) });
}

export function completeSession(sessionId: string, body: CompleteSessionRequest): Promise<CompleteSessionResponse> {
  return request<CompleteSessionResponse>(`${base}/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getStats(nickname: string): Promise<FroggerStats> {
  return request<FroggerStats>(`${base}/players/${encodeURIComponent(nickname)}/stats`);
}

export function getHistory(nickname: string, limit = 20): Promise<FroggerHistoryEntry[]> {
  return request<FroggerHistoryEntry[]>(`${base}/players/${encodeURIComponent(nickname)}/history?limit=${limit}`);
}
