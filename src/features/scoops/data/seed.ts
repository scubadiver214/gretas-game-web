import { LEVEL_XP, levelForXp } from "../config";
import { allUnlockables } from "../game-data/catalog";
import { avatarPrizesEarned } from "../logic/prizes";
import type { CurrentCreation, UnlockKind } from "../types";
import type { DbAchievement, DbFavorite, DbMake, DbProfile, DbRecipe, DbUnlock, DbUser, ScoopsDatabase } from "./schema";
import { emptyDatabase } from "./schema";

const AT = "2026-10-20T15:00:00.000Z";

function xpForLevel(level: number): number {
  return LEVEL_XP[Math.min(LEVEL_XP.length, Math.max(1, level)) - 1] ?? 0;
}

function unlocksFor(userId: string, level: number): DbUnlock[] {
  return allUnlockables()
    .filter(({ item }) => item.unlockedByDefault || level >= item.unlockLevel)
    .map(({ kind, item }) => ({ userId, kind: kind satisfies UnlockKind, itemId: item.id, unlockedAt: AT }));
}

function user(id: string, displayName: string, level: number, coins: number, recipesCreated: number, recipesDiscovered: number): { user: DbUser; profile: DbProfile } {
  return {
    user: { id, username: displayName, createdAt: AT },
    profile: {
      userId: id,
      displayName,
      avatar: "classic",
      level,
      xp: xpForLevel(level),
      coins,
      recipesCreated,
      recipesDiscovered,
      tutorialSeen: false,
      recipeStar: false,
    },
  };
}

interface SeedRecipe {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  containerId: string;
  containerType: "cone" | "cup";
  mix: DbRecipe["mix"];
  flavors: string[];
  toppings: string[];
  sauces: string[];
  extras: string[];
  isPublic: boolean;
  shelbyFavorite?: boolean;
  createdAt: string;
  timesMade: number;
  favoriteCount: number;
  fans?: string[];
}

function pushRecipe(db: ScoopsDatabase, recipe: SeedRecipe): void {
  const row: DbRecipe = {
    id: recipe.id,
    ownerUserId: recipe.ownerUserId,
    name: recipe.name,
    description: recipe.description,
    containerType: recipe.containerType,
    containerId: recipe.containerId,
    mix: recipe.mix,
    isPublic: recipe.isPublic,
    inspiredByRecipeId: null,
    inspiredByName: null,
    inspiredByOwner: null,
    createdAt: recipe.createdAt,
    updatedAt: recipe.createdAt,
    timesMade: recipe.timesMade,
    favoriteCount: recipe.fans?.length ?? recipe.favoriteCount,
    shelbyFavorite: recipe.shelbyFavorite ?? false,
  };
  db.recipes.push(row);
  recipe.flavors.forEach((flavorId, position) => db.recipeFlavors.push({ recipeId: recipe.id, flavorId, position }));
  recipe.toppings.forEach((toppingId, position) => db.recipeToppings.push({ recipeId: recipe.id, toppingId, position }));
  recipe.sauces.forEach((sauceId, position) => db.recipeSauces.push({ recipeId: recipe.id, sauceId, position }));
  recipe.extras.forEach((extraId, position) => db.recipeExtras.push({ recipeId: recipe.id, extraId, position }));
  for (const fan of recipe.fans ?? []) {
    const favorite: DbFavorite = { userId: fan, recipeId: recipe.id, createdAt: recipe.createdAt };
    db.favorites.push(favorite);
  }
  for (let i = 0; i < Math.min(recipe.timesMade, 3); i++) {
    const make: DbMake = { id: `make_${recipe.id}_${i}`, recipeId: recipe.id, userId: recipe.ownerUserId, createdAt: recipe.createdAt };
    db.makes.push(make);
  }
}

function badge(userId: string, achievementId: string): DbAchievement {
  return { userId, achievementId, unlockedAt: AT };
}

/** A shop that already feels lived in. Shelby is the demo scooper. */
export function createSeedDatabase(): ScoopsDatabase {
  const db = emptyDatabase();
  const people = [
    user("shelby", "Shelby", 12, 180, 2, 1),
    user("berry", "Berry", 4, 40, 1, 0),
    user("coco", "Coco", 5, 55, 1, 0),
    user("noodle", "Noodle", 8, 70, 1, 0),
    user("pip", "Pip", 9, 90, 1, 1),
  ];
  for (const person of people) {
    if (levelForXp(person.profile.xp) !== person.profile.level) {
      person.profile.level = levelForXp(person.profile.xp);
    }
    db.users.push(person.user);
    db.profiles.push(person.profile);
    db.unlocks.push(...unlocksFor(person.user.id, person.profile.level));
    db.achievements.push(badge(person.user.id, "first-scoop"));
  }
  db.achievements.push(
    badge("shelby", "double-trouble"),
    badge("shelby", "triple-scoop"),
    badge("shelby", "rainbow-power"),
    badge("shelby", "chocolate-overload"),
    badge("pip", "double-trouble"),
  );
  db.discoveries.push({ userId: "shelby", secretId: "super-moon", discoveredAt: AT });
  db.discoveries.push({ userId: "pip", secretId: "birthday-blast", discoveredAt: AT });

  pushRecipe(db, {
    id: "recipe_super_moon",
    ownerUserId: "shelby",
    name: "Shelby's Super Moon",
    description: "Superman, Blue Moon, and a cloud of marshmallow.",
    containerId: "waffle-cone",
    containerType: "cone",
    mix: "triple",
    flavors: ["superman", "blue-moon", "vanilla"],
    toppings: ["rainbow-sprinkles", "gummy-bears"],
    sauces: ["marshmallow"],
    extras: ["cherry"],
    isPublic: true,
    shelbyFavorite: true,
    createdAt: "2026-10-20T15:00:00.000Z",
    timesMade: 12,
    favoriteCount: 3,
    fans: ["berry", "coco", "pip"],
  });
  pushRecipe(db, {
    id: "recipe_chocolate_explosion",
    ownerUserId: "shelby",
    name: "Chocolate Explosion",
    description: "Chocolate all the way down.",
    containerId: "chocolate-waffle",
    containerType: "cone",
    mix: "triple",
    flavors: ["chocolate", "fudge", "rocky-road"],
    toppings: ["chocolate-chips", "brownie-pieces"],
    sauces: ["hot-fudge"],
    extras: ["brownie"],
    isPublic: true,
    createdAt: "2026-10-22T15:00:00.000Z",
    timesMade: 9,
    favoriteCount: 2,
    fans: ["coco", "noodle"],
  });
  pushRecipe(db, {
    id: "recipe_rainbow_unicorn",
    ownerUserId: "pip",
    name: "Rainbow Unicorn",
    description: "Every color Pip could find.",
    containerId: "rainbow-cone",
    containerType: "cone",
    mix: "triple",
    flavors: ["cotton-candy", "birthday-cake", "superman"],
    toppings: ["rainbow-sprinkles", "candy-stars"],
    sauces: ["rainbow-sauce"],
    extras: ["rainbow"],
    isPublic: true,
    shelbyFavorite: true,
    createdAt: "2026-10-26T15:00:00.000Z",
    timesMade: 15,
    favoriteCount: 4,
    fans: ["shelby", "berry", "coco", "noodle"],
  });
  pushRecipe(db, {
    id: "recipe_cookie_monster",
    ownerUserId: "coco",
    name: "Cookie Monster",
    description: "Cookies in the scoop and on the scoop.",
    containerId: "sugar-cone",
    containerType: "cone",
    mix: "triple",
    flavors: ["cookies-cream", "cookie-dough", "chocolate"],
    toppings: ["oreo-pieces", "mini-cookies"],
    sauces: ["chocolate-syrup"],
    extras: ["cookie"],
    isPublic: true,
    createdAt: "2026-10-18T15:00:00.000Z",
    timesMade: 6,
    favoriteCount: 1,
    fans: ["berry"],
  });
  pushRecipe(db, {
    id: "recipe_berry_blast",
    ownerUserId: "berry",
    name: "Berry Blast",
    description: "Strawberry, vanilla, and a pile of berries.",
    containerId: "large-cup",
    containerType: "cup",
    mix: "double",
    flavors: ["strawberry", "vanilla"],
    toppings: ["strawberries", "blueberries"],
    sauces: ["strawberry-sauce"],
    extras: ["cherry"],
    isPublic: true,
    createdAt: "2026-10-24T15:00:00.000Z",
    timesMade: 8,
    favoriteCount: 2,
    fans: ["shelby", "pip"],
  });
  pushRecipe(db, {
    id: "recipe_wormy_moon",
    ownerUserId: "noodle",
    name: "Wormy Moon",
    description: "A wiggly blue experiment.",
    containerId: "mystery-cup",
    containerType: "cup",
    mix: "swirl",
    flavors: ["blue-moon", "cotton-candy"],
    toppings: ["gummy-worms", "pop-rocks"],
    sauces: ["blue-raspberry"],
    extras: ["gummy-worm"],
    isPublic: true,
    createdAt: "2026-10-25T15:00:00.000Z",
    timesMade: 4,
    favoriteCount: 1,
    fans: ["pip"],
  });
  awardSeedPrizes(db);
  return db;
}

function awardSeedPrizes(db: ScoopsDatabase): void {
  const owners = [...new Set(db.recipes.map((recipe) => recipe.ownerUserId))];
  for (const userId of owners) {
    const mine = db.recipes.filter((recipe) => recipe.ownerUserId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const owned = new Set(db.unlocks.filter((row) => row.userId === userId && row.kind === "avatar").map((row) => row.itemId));
    let last: string | null = null;
    mine.forEach((recipe, index) => {
      const creation: CurrentCreation = {
        containerId: recipe.containerId,
        mix: recipe.mix,
        flavorIds: ordered(db.recipeFlavors.filter((row) => row.recipeId === recipe.id)).map((row) => row.flavorId),
        toppingIds: ordered(db.recipeToppings.filter((row) => row.recipeId === recipe.id)).map((row) => row.toppingId),
        sauceIds: ordered(db.recipeSauces.filter((row) => row.recipeId === recipe.id)).map((row) => row.sauceId),
        extraIds: ordered(db.recipeExtras.filter((row) => row.recipeId === recipe.id)).map((row) => row.extraId),
      };
      for (const avatar of avatarPrizesEarned({ creation, recipesCreated: index + 1 }, owned)) {
        db.unlocks.push({ userId, kind: "avatar", itemId: avatar.id, unlockedAt: recipe.createdAt });
        owned.add(avatar.id);
        last = avatar.id;
      }
    });
    const profile = db.profiles.find((row) => row.userId === userId);
    if (profile && last) profile.avatar = last;
  }
}

function ordered<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}
