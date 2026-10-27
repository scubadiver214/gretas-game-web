/** Domain types for Shelby's Scoops. Screens and the repository share these. */

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type MixStyle = "single" | "double" | "triple" | "swirl" | "layered" | "half" | "crazy";

export type ServeKind = "cone" | "cup";

export type Texture = "smooth" | "chips" | "swirl" | "chunks" | "speckle" | "ripples";

export type Scatter = "dots" | "chunks" | "puffs" | "slices" | "stars" | "worms";

export type ContainerPattern = "plain" | "waffle" | "sprinkles" | "rainbow" | "stripes" | "logo" | "stars" | "mystery";

export type UnlockKind = "flavor" | "container" | "topping" | "sauce" | "extra" | "avatar";

export type RecipeSort = "newest" | "popular" | "made" | "favorited" | "weird" | "colorful" | "shelby";

export interface UnlockRule {
  unlockLevel: number;
  unlockedByDefault: boolean;
}

export interface Flavor extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  color: string;
  colorDeep: string;
  /** Second color for chips, chunks, or a swirl. */
  textureColor: string;
  texture: Texture;
  /** Optional third stripe, used by Superman. */
  accent?: string;
  specialAnimation?: "sparkle" | "glow";
  tags?: readonly string[];
}

export interface Container extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  serve: ServeKind;
  color: string;
  accent: string;
  pattern: ContainerPattern;
}

export interface Topping extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  color: string;
  scatter: Scatter;
  tags?: readonly string[];
}

export interface Sauce extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  color: string;
  tags?: readonly string[];
}

export interface Extra extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  tags?: readonly string[];
}

export interface SecretRecipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bonusXp: number;
  bonusCoins: number;
  flavors: readonly string[];
  toppings: readonly string[];
  sauces: readonly string[];
  extras: readonly string[];
  containerId?: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface AvatarDef extends UnlockRule {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  color: string;
  /** How a kid wins this by saving a scoop. Missing on the free starters. */
  prize?: string;
}

/** What the player is building right now. Not a saved recipe yet. */
export interface CurrentCreation {
  containerId?: string;
  mix: MixStyle;
  flavorIds: string[];
  toppingIds: string[];
  sauceIds: string[];
  extraIds: string[];
}

export interface Inspiration {
  recipeId: string;
  name: string;
  owner: string;
}

export interface IceCreamRecipe {
  id: string;
  ownerUserId: string;
  ownerName: string;
  name: string;
  description?: string;
  containerId: string;
  serve: ServeKind;
  mix: MixStyle;
  scoops: { flavorId: string }[];
  toppings: { toppingId: string }[];
  sauces: { sauceId: string }[];
  extras: { extraId: string }[];
  isPublic: boolean;
  inspiredBy?: Inspiration;
  createdAt: string;
  updatedAt: string;
  stats: { timesMade: number; favorites: number };
  shelbyFavorite: boolean;
}

export interface ScoopUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  recipesCreated: number;
  recipesDiscovered: number;
  createdAt: string;
}

export interface UnlockSet {
  flavors: string[];
  containers: string[];
  toppings: string[];
  sauces: string[];
  extras: string[];
  avatars: string[];
}

export type ShopEventKind = "double-xp" | "mystery" | "challenge";

export interface ShopEvent {
  id: string;
  kind: ShopEventKind;
  title: string;
  detail: string;
  date: string;
  completed: boolean;
  flavorId?: string;
  flavorIds?: string[];
  sauceIds?: string[];
  toppingIds?: string[];
  extraIds?: string[];
}

export interface ScoopSession {
  user: ScoopUser;
  unlocks: UnlockSet;
  achievements: { id: string; unlockedAt: string }[];
  discoveries: string[];
  recipes: IceCreamRecipe[];
  favoriteIds: string[];
  event: ShopEvent | null;
  tutorialSeen: boolean;
}

export interface SaveRecipeInput {
  name: string;
  description?: string;
  isPublic: boolean;
  containerId: string;
  mix: MixStyle;
  flavorIds: string[];
  toppingIds: string[];
  sauceIds: string[];
  extraIds: string[];
  inspiredByRecipeId?: string;
}

export interface RewardUnlock {
  kind: UnlockKind;
  id: string;
  name: string;
}

export interface RewardBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface RewardSecret {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface RewardAvatar {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  prize: string;
}

export interface SaveRewards {
  xp: number;
  coins: number;
  levelBefore: number;
  levelAfter: number;
  unlocked: RewardUnlock[];
  achievements: RewardBadge[];
  discoveries: RewardSecret[];
  avatars: RewardAvatar[];
  eventNote: string | null;
}

export interface SaveResult {
  recipe: IceCreamRecipe;
  session: ScoopSession;
  rewards: SaveRewards;
}

export interface MakeResult {
  recipe: IceCreamRecipe;
  session: ScoopSession;
  xp: number;
  coins: number;
  note: string | null;
}

export interface FavoriteResult {
  recipe: IceCreamRecipe;
  favorite: boolean;
  session: ScoopSession;
}

export interface ProfilePatch {
  avatar?: string;
  tutorialSeen?: boolean;
}

export const EMPTY_CREATION: CurrentCreation = {
  mix: "single",
  flavorIds: [],
  toppingIds: [],
  sauceIds: [],
  extraIds: [],
};

export function creationFromRecipe(recipe: IceCreamRecipe): CurrentCreation {
  return {
    containerId: recipe.containerId,
    mix: recipe.mix,
    flavorIds: recipe.scoops.map((s) => s.flavorId),
    toppingIds: recipe.toppings.map((t) => t.toppingId),
    sauceIds: recipe.sauces.map((s) => s.sauceId),
    extraIds: recipe.extras.map((e) => e.extraId),
  };
}

export function creationHasProgress(creation: CurrentCreation): boolean {
  return Boolean(
    creation.containerId ||
      creation.flavorIds.length ||
      creation.toppingIds.length ||
      creation.sauceIds.length ||
      creation.extraIds.length,
  );
}
