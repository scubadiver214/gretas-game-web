import type { MixStyle, ServeKind, UnlockKind } from "../types";

export const DB_VERSION = 1;

export interface DbUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface DbProfile {
  userId: string;
  displayName: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  recipesCreated: number;
  recipesDiscovered: number;
  tutorialSeen: boolean;
  recipeStar: boolean;
}

export interface DbRecipe {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  containerType: ServeKind;
  containerId: string;
  mix: MixStyle;
  isPublic: boolean;
  inspiredByRecipeId: string | null;
  inspiredByName: string | null;
  inspiredByOwner: string | null;
  createdAt: string;
  updatedAt: string;
  timesMade: number;
  favoriteCount: number;
  shelbyFavorite: boolean;
}

export interface DbRecipeFlavor {
  recipeId: string;
  flavorId: string;
  position: number;
}

export interface DbRecipeTopping {
  recipeId: string;
  toppingId: string;
  position: number;
}

export interface DbRecipeSauce {
  recipeId: string;
  sauceId: string;
  position: number;
}

export interface DbRecipeExtra {
  recipeId: string;
  extraId: string;
  position: number;
}

export interface DbFavorite {
  userId: string;
  recipeId: string;
  createdAt: string;
}

export interface DbAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface DbUnlock {
  userId: string;
  kind: UnlockKind;
  itemId: string;
  unlockedAt: string;
}

export interface DbMake {
  id: string;
  recipeId: string;
  userId: string;
  createdAt: string;
}

export interface DbDiscovery {
  userId: string;
  secretId: string;
  discoveredAt: string;
}

export interface DbEvent {
  userId: string;
  date: string;
  eventId: string;
  completed: boolean;
}

export interface ScoopsDatabase {
  version: number;
  users: DbUser[];
  profiles: DbProfile[];
  recipes: DbRecipe[];
  recipeFlavors: DbRecipeFlavor[];
  recipeToppings: DbRecipeTopping[];
  recipeSauces: DbRecipeSauce[];
  recipeExtras: DbRecipeExtra[];
  favorites: DbFavorite[];
  achievements: DbAchievement[];
  unlocks: DbUnlock[];
  makes: DbMake[];
  discoveries: DbDiscovery[];
  events: DbEvent[];
}

export function emptyDatabase(): ScoopsDatabase {
  return {
    version: DB_VERSION,
    users: [],
    profiles: [],
    recipes: [],
    recipeFlavors: [],
    recipeToppings: [],
    recipeSauces: [],
    recipeExtras: [],
    favorites: [],
    achievements: [],
    unlocks: [],
    makes: [],
    discoveries: [],
    events: [],
  };
}
