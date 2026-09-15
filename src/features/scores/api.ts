import type { CharacterId, GameMode } from "@/features/player/types";

export interface ScoreEntry {
  rank: number;
  nickname: string;
  character: CharacterId;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

export interface SubmitScoreRequest {
  nickname: string;
  character: CharacterId;
  mode: GameMode;
  score: number;
  durationSeconds: number;
}

export interface SubmitScoreResponse {
  id: string;
  rank: number;
  isPersonalBest: boolean;
}

export interface PersonalBest {
  mode: GameMode;
  score: number;
  createdAt: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { title?: string; detail?: string };
      detail = body.detail ?? body.title ?? detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export function getTopScores(mode: GameMode, limit = 20): Promise<ScoreEntry[]> {
  const q = new URLSearchParams({ mode, limit: String(limit) });
  return request<ScoreEntry[]>(`/api/scores/top?${q}`);
}

export function submitScore(body: SubmitScoreRequest): Promise<SubmitScoreResponse> {
  return request<SubmitScoreResponse>("/api/scores", { method: "POST", body: JSON.stringify(body) });
}

export function getPersonalBests(nickname: string): Promise<PersonalBest[]> {
  return request<PersonalBest[]>(`/api/players/${encodeURIComponent(nickname)}/best`);
}
