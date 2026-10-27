import { DESCRIPTION_MAX, NAME_MAX, NAME_MIN } from "../config";

const BLOCKED = [
  "ass",
  "bastard",
  "bitch",
  "crap",
  "damn",
  "dick",
  "dumb",
  "fuck",
  "hell",
  "idiot",
  "jerk",
  "kill",
  "piss",
  "poop",
  "porn",
  "sex",
  "shit",
  "slut",
  "stupid",
  "suck",
  "whore",
] as const;

export interface ModerationOk {
  ok: true;
  name: string;
  description: string;
}

export interface ModerationNo {
  ok: false;
  message: string;
}

function squash(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

function rude(text: string): boolean {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.some((token) =>
    BLOCKED.some((bad) => token === bad || token === `${bad}s` || token === `${bad}ing` || token === `${bad}er`),
  );
}

export function moderateRecipeText(nameRaw: string, descriptionRaw?: string): ModerationOk | ModerationNo {
  const name = squash(nameRaw);
  const description = squash(descriptionRaw ?? "");
  if (name.length < NAME_MIN) return { ok: false, message: "That name is too short." };
  if (name.length > NAME_MAX) return { ok: false, message: "That name is too long. Try a shorter one." };
  if (description.length > DESCRIPTION_MAX) return { ok: false, message: "That note is a little long. Can you say it shorter?" };
  if (/https?:|www\.|\.com\b|@|\d{7,}/i.test(`${name} ${description}`)) {
    return { ok: false, message: "Let's skip web links and long numbers." };
  }
  if (!/^[\p{L}\p{N}\p{Extended_Pictographic} !?'.,&+-]+$/u.test(name)) {
    return { ok: false, message: "Letters, numbers, and a few fun marks work best." };
  }
  if (description && !/^[\p{L}\p{N}\p{Extended_Pictographic} !?'.,&+-]+$/u.test(description)) {
    return { ok: false, message: "Let's keep the note simple." };
  }
  if (rude(name) || rude(description)) return { ok: false, message: "Let's pick a friendlier name!" };
  return { ok: true, name, description };
}
