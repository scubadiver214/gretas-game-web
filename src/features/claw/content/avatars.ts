import type { Rarity } from "../engine/types";
import type { WorldId } from "./worlds";

/**
 * Collectible avatars and the milestones that unlock them. Rules are data so
 * the API can evaluate the same milestones server-side (see claw-content.json).
 */

export type AvatarRule =
  | { kind: "firstGrab" }
  | { kind: "prizesCollected"; count: number }
  | { kind: "uniquePrizes"; count: number }
  | { kind: "levelCleared"; level: number }
  | { kind: "worldMystery"; world: WorldId };

/** Inline SVG badge drawn by content/avatarArt.tsx. */
export type AvatarArtId =
  | "bear"
  | "slime"
  | "unicorn"
  | "robot"
  | "dino"
  | "claw"
  | "dragon"
  | "champion"
  | "driver"
  | "princess"
  | "astronaut"
  | "puppy";

export interface AvatarDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Plain-language description of how it is earned. */
  earnedBy: string;
  rule: AvatarRule;
  art: AvatarArtId;
  /** [background, body, accent]. */
  palette: [string, string, string];
}

export const AVATARS: readonly AvatarDef[] = [
  { id: "baby-bear", name: "Baby Bear", rarity: "common", earnedBy: "Grab your first toy", rule: { kind: "firstGrab" }, art: "bear", palette: ["#FFE3F1", "#B5733A", "#2B2D42"] },
  { id: "slime-buddy", name: "Slime Buddy", rarity: "common", earnedBy: "Collect 5 toys", rule: { kind: "prizesCollected", count: 5 }, art: "slime", palette: ["#E3FFE8", "#5EE86A", "#2B2D42"] },
  { id: "rainbow-unicorn", name: "Rainbow Unicorn", rarity: "uncommon", earnedBy: "Clear level 5", rule: { kind: "levelCleared", level: 5 }, art: "unicorn", palette: ["#F3E8FF", "#FFFFFF", "#FF4FD8"] },
  { id: "robot-explorer", name: "Robot Explorer", rarity: "uncommon", earnedBy: "Clear level 10", rule: { kind: "levelCleared", level: 10 }, art: "robot", palette: ["#E0F2FF", "#9AD4FF", "#FF6A57"] },
  { id: "race-driver", name: "Race Car Driver", rarity: "rare", earnedBy: "Win the Toy Box mystery prize", rule: { kind: "worldMystery", world: "toybox" }, art: "driver", palette: ["#FFF1B8", "#E63946", "#FFFFFF"] },
  { id: "dino-champion", name: "Dinosaur Champion", rarity: "rare", earnedBy: "Collect 25 different toys", rule: { kind: "uniquePrizes", count: 25 }, art: "dino", palette: ["#E3FFE8", "#3FA34D", "#FFD54D"] },
  { id: "golden-claw", name: "Golden Claw", rarity: "rare", earnedBy: "Clear level 20", rule: { kind: "levelCleared", level: 20 }, art: "claw", palette: ["#FFF7D6", "#FFD54D", "#B8860B"] },
  { id: "sparkly-princess", name: "Sparkly Princess", rarity: "rare", earnedBy: "Win the Candy Carnival mystery prize", rule: { kind: "worldMystery", world: "candy" }, art: "princess", palette: ["#FFE3F1", "#FF8AD0", "#FFD54D"] },
  { id: "silly-dino", name: "Silly Dinosaur", rarity: "rare", earnedBy: "Win the Dinosaur Jungle mystery prize", rule: { kind: "worldMystery", world: "jungle" }, art: "dino", palette: ["#DFF7C8", "#0E9594", "#FF6A57"] },
  { id: "dragon-master", name: "Dragon Master", rarity: "legendary", earnedBy: "Clear level 30", rule: { kind: "levelCleared", level: 30 }, art: "dragon", palette: ["#EADFFF", "#7C3AED", "#FFD54D"] },
  { id: "astronaut", name: "Friendly Astronaut", rarity: "rare", earnedBy: "Win the Space Toy Station mystery prize", rule: { kind: "worldMystery", world: "space" }, art: "astronaut", palette: ["#0F1624", "#FFFFFF", "#41C9FF"] },
  { id: "pirate-puppy", name: "Pirate Puppy", rarity: "legendary", earnedBy: "Win the Rainbow Treasure mystery prize", rule: { kind: "worldMystery", world: "rainbow" }, art: "puppy", palette: ["#FFF1B8", "#D9A66B", "#2B2D42"] },
  { id: "claw-champion", name: "Legendary Claw Champion", rarity: "legendary", earnedBy: "Clear level 50", rule: { kind: "levelCleared", level: 50 }, art: "champion", palette: ["#1A1430", "#FFD54D", "#FF4FD8"] },
];

export const AVATAR_BY_ID: Readonly<Record<string, AvatarDef>> = Object.fromEntries(AVATARS.map((a) => [a.id, a]));
