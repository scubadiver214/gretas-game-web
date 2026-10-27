import { DROPPED_SCOOP, MIX_MAX, NAME_MAX } from "../config";
import { catalog, isAvailable } from "../game-data/catalog";
import { todayKey, eventForUser } from "../logic/events";
import { moderateRecipeText } from "../logic/moderate";
import { avatarPrizesEarned } from "../logic/prizes";
import { evaluateAchievements, scoreCreation, unlocksBetween } from "../logic/progression";
import { matchingSecrets } from "../logic/secrets";
import type {
  CurrentCreation,
  FavoriteResult,
  IceCreamRecipe,
  MakeResult,
  MixStyle,
  ProfilePatch,
  RecipeSort,
  SaveRecipeInput,
  SaveResult,
  ScoopSession,
  UnlockKind,
  UnlockSet,
} from "../types";
import { ScoopsRuleError } from "./errors";
import { playerIdentity, type PlayerIdentity } from "./identity";
import { createSeedDatabase } from "./seed";
import type { DbProfile, DbRecipe, ScoopsDatabase } from "./schema";
import { sortRecipes } from "../logic/rank";
import { levelForXp } from "../config";

const MIXES = new Set<MixStyle>(["single", "double", "triple", "swirl", "layered", "half", "crazy"]);
const NOT_FOUND = "Shelby can't find that recipe.";
const NOT_YOURS = "That recipe lives in someone else's scoop book.";
const LOCKED = (name: string) => `${name} is still in the freezer. Keep scooping to unlock it!`;

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function idList(value: unknown, tooMany: string): string[] {
  if (!Array.isArray(value)) throw new ScoopsRuleError(400, DROPPED_SCOOP, "expected a list of ingredients");
  if (value.length > 20) throw new ScoopsRuleError(400, tooMany);
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || item.length > 48) {
      throw new ScoopsRuleError(400, DROPPED_SCOOP, "bad ingredient id");
    }
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function readSave(body: unknown): SaveRecipeInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ScoopsRuleError(400, DROPPED_SCOOP, "save body was not an object");
  }
  const row = body as Record<string, unknown>;
  const mix = row.mix;
  if (typeof mix !== "string" || !MIXES.has(mix as MixStyle)) {
    throw new ScoopsRuleError(400, "Pick a scoop style first.");
  }
  const containerId = row.containerId;
  if (typeof containerId !== "string") throw new ScoopsRuleError(400, "Pick a cone or a cup.");
  const inspired = row.inspiredByRecipeId;
  return {
    name: typeof row.name === "string" ? row.name : "",
    description: typeof row.description === "string" ? row.description : "",
    isPublic: row.isPublic === true,
    containerId,
    mix: mix as MixStyle,
    flavorIds: idList(row.flavorIds, "That's too many scoops!"),
    toppingIds: idList(row.toppingIds, "That's too many toppings!"),
    sauceIds: idList(row.sauceIds, "That's too many sauces!"),
    extraIds: idList(row.extraIds, "That's too many decorations!"),
    inspiredByRecipeId: typeof inspired === "string" && inspired.length > 0 ? inspired : undefined,
  };
}

function creationOf(input: SaveRecipeInput): CurrentCreation {
  return {
    containerId: input.containerId,
    mix: input.mix,
    flavorIds: input.flavorIds,
    toppingIds: input.toppingIds,
    sauceIds: input.sauceIds,
    extraIds: input.extraIds,
  };
}

function canSee(row: DbRecipe, userId: string): boolean {
  return row.isPublic || row.ownerUserId === userId;
}

function toRecipe(db: ScoopsDatabase, row: DbRecipe): IceCreamRecipe {
  const owner = db.profiles.find((profile) => profile.userId === row.ownerUserId);
  const take = <T extends { position: number }>(rows: T[]) => [...rows].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    ownerName: owner?.displayName ?? "Scooper",
    name: row.name,
    description: row.description || undefined,
    containerId: row.containerId,
    serve: row.containerType,
    mix: row.mix,
    scoops: take(db.recipeFlavors.filter((item) => item.recipeId === row.id)).map((item) => ({ flavorId: item.flavorId })),
    toppings: take(db.recipeToppings.filter((item) => item.recipeId === row.id)).map((item) => ({ toppingId: item.toppingId })),
    sauces: take(db.recipeSauces.filter((item) => item.recipeId === row.id)).map((item) => ({ sauceId: item.sauceId })),
    extras: take(db.recipeExtras.filter((item) => item.recipeId === row.id)).map((item) => ({ extraId: item.extraId })),
    isPublic: row.isPublic,
    inspiredBy:
      row.inspiredByRecipeId && row.inspiredByName && row.inspiredByOwner
        ? { recipeId: row.inspiredByRecipeId, name: row.inspiredByName, owner: row.inspiredByOwner }
        : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stats: { timesMade: row.timesMade, favorites: row.favoriteCount },
    shelbyFavorite: row.shelbyFavorite,
  };
}

function unlockSet(db: ScoopsDatabase, userId: string): UnlockSet {
  const set: UnlockSet = { flavors: [], containers: [], toppings: [], sauces: [], extras: [], avatars: [] };
  for (const row of db.unlocks) {
    if (row.userId !== userId) continue;
    const bucket = set[`${row.kind}s` as keyof UnlockSet];
    if (bucket) bucket.push(row.itemId);
  }
  return set;
}

function explicitIds(db: ScoopsDatabase, userId: string, kind: UnlockKind): Set<string> {
  return new Set(db.unlocks.filter((row) => row.userId === userId && row.kind === kind).map((row) => row.itemId));
}

/**
 * In-memory shop. Mutations clone the document first, so a thrown rule
 * leaves the previous shop untouched. The file store passes a persist callback.
 */
export class MemoryRepository {
  private db: ScoopsDatabase;

  constructor(
    initial?: ScoopsDatabase,
    private readonly persist?: (db: ScoopsDatabase) => void,
  ) {
    this.db = initial ?? createSeedDatabase();
  }

  ensureUser(nickname: string): ScoopSession {
    const identity = playerIdentity(nickname);
    const existing = this.db.users.find((user) => user.id === identity.id);
    if (!existing) {
      this.write((draft) => this.insertStarter(draft, identity));
    } else {
      const profile = this.db.profiles.find((row) => row.userId === identity.id);
      if (profile && profile.displayName !== identity.displayName) {
        this.write((draft) => {
          const row = draft.profiles.find((item) => item.userId === identity.id);
          const user = draft.users.find((item) => item.id === identity.id);
          if (row) row.displayName = identity.displayName;
          if (user) user.username = identity.displayName;
        });
      }
    }
    return this.sessionFrom(this.db, identity.id);
  }

  updateProfile(nickname: string, patch: ProfilePatch): ScoopSession {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    this.write((draft) => {
      const profile = this.profile(draft, identity.id);
      if (typeof patch.tutorialSeen === "boolean") profile.tutorialSeen = patch.tutorialSeen;
      if (patch.avatar) {
        const avatar = catalog.avatarById.get(patch.avatar);
        if (!avatar) throw new ScoopsRuleError(400, "Shelby doesn't have that avatar.");
        if (!isAvailable(avatar, profile.level, explicitIds(draft, identity.id, "avatar"))) {
          throw new ScoopsRuleError(400, "That avatar is still locked. Keep scooping!");
        }
        profile.avatar = avatar.id;
      }
    });
    return this.sessionFrom(this.db, identity.id);
  }

  listRecipes(nickname: string, scope: "mine" | "community", sort: RecipeSort): IceCreamRecipe[] {
    const identity = playerIdentity(nickname);
    const rows = scope === "mine"
      ? this.db.recipes.filter((recipe) => recipe.ownerUserId === identity.id)
      : this.db.recipes.filter((recipe) => recipe.isPublic);
    return sortRecipes(rows.map((recipe) => toRecipe(this.db, recipe)), sort).slice(0, 80);
  }

  getRecipe(nickname: string, id: string): IceCreamRecipe {
    const identity = playerIdentity(nickname);
    const row = this.visible(this.db, identity.id, id);
    return toRecipe(this.db, row);
  }

  listUserRecipes(nickname: string, ownerId: string): IceCreamRecipe[] {
    const identity = playerIdentity(nickname);
    const owner = ownerId.toLowerCase();
    return sortRecipes(
      this.db.recipes
        .filter((recipe) => recipe.ownerUserId === owner && (recipe.isPublic || owner === identity.id))
        .map((recipe) => toRecipe(this.db, recipe)),
      "newest",
    );
  }

  listAchievements(nickname: string, ownerId: string): { id: string; unlockedAt: string }[] {
    playerIdentity(nickname);
    return this.db.achievements
      .filter((row) => row.userId === ownerId.toLowerCase())
      .map((row) => ({ id: row.achievementId, unlockedAt: row.unlockedAt }));
  }

  listUnlocks(nickname: string, ownerId: string): UnlockSet {
    playerIdentity(nickname);
    return unlockSet(this.db, ownerId.toLowerCase());
  }

  createRecipe(nickname: string, body: unknown): SaveResult {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    let result: SaveResult | null = null;
    this.write((draft) => {
      result = this.saveInto(draft, identity, null, readSave(body));
    });
    if (!result) throw new ScoopsRuleError(500, DROPPED_SCOOP, "save produced nothing");
    return result;
  }

  updateRecipe(nickname: string, id: string, body: unknown): SaveResult {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    let result: SaveResult | null = null;
    this.write((draft) => {
      const current = draft.recipes.find((recipe) => recipe.id === id);
      if (!current) throw new ScoopsRuleError(404, NOT_FOUND);
      if (current.ownerUserId !== identity.id) throw new ScoopsRuleError(403, NOT_YOURS);
      result = this.saveInto(draft, identity, current, readSave(body));
    });
    if (!result) throw new ScoopsRuleError(500, DROPPED_SCOOP, "update produced nothing");
    return result;
  }

  deleteRecipe(nickname: string, id: string): ScoopSession {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    this.write((draft) => {
      const current = draft.recipes.find((recipe) => recipe.id === id);
      if (!current) throw new ScoopsRuleError(404, NOT_FOUND);
      if (current.ownerUserId !== identity.id) throw new ScoopsRuleError(403, NOT_YOURS);
      this.detach(draft, id);
      draft.recipes = draft.recipes.filter((recipe) => recipe.id !== id);
      draft.favorites = draft.favorites.filter((favorite) => favorite.recipeId !== id);
      draft.makes = draft.makes.filter((make) => make.recipeId !== id);
    });
    return this.sessionFrom(this.db, identity.id);
  }

  favorite(nickname: string, id: string): FavoriteResult {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    let favorite = false;
    this.write((draft) => {
      const row = this.visible(draft, identity.id, id);
      const existing = draft.favorites.find((item) => item.userId === identity.id && item.recipeId === id);
      if (existing) {
        draft.favorites = draft.favorites.filter((item) => item !== existing);
        favorite = false;
      } else {
        draft.favorites.push({ userId: identity.id, recipeId: id, createdAt: new Date().toISOString() });
        favorite = true;
      }
      row.favoriteCount = draft.favorites.filter((item) => item.recipeId === id).length;
    });
    const recipe = toRecipe(this.db, this.visible(this.db, identity.id, id));
    return { recipe, favorite, session: this.sessionFrom(this.db, identity.id) };
  }

  make(nickname: string, id: string): MakeResult {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    let note: string | null = null;
    this.write((draft) => {
      const row = this.visible(draft, identity.id, id);
      const now = new Date().toISOString();
      row.timesMade += 1;
      row.updatedAt = now;
      draft.makes.push({ id: newId("make"), recipeId: id, userId: identity.id, createdAt: now });
      this.applyXp(draft, identity.id, 10, 5, now);
      if (row.ownerUserId !== identity.id) note = this.awardRecipeStar(draft, row.ownerUserId, now);
    });
    const recipe = toRecipe(this.db, this.visible(this.db, identity.id, id));
    return { recipe, session: this.sessionFrom(this.db, identity.id), xp: 10, coins: 5, note };
  }

  clone(nickname: string, id: string, name?: string): SaveResult {
    this.ensureUser(nickname);
    const identity = playerIdentity(nickname);
    const source = this.visible(this.db, identity.id, id);
    const recipe = toRecipe(this.db, source);
    let title = name?.trim() || `My ${recipe.name}`;
    if (title.length > NAME_MAX) title = title.slice(0, NAME_MAX).trim();
    return this.createRecipe(nickname, {
      name: title,
      description: recipe.description ?? "",
      isPublic: false,
      containerId: recipe.containerId,
      mix: recipe.mix,
      flavorIds: recipe.scoops.map((scoop) => scoop.flavorId),
      toppingIds: recipe.toppings.map((topping) => topping.toppingId),
      sauceIds: recipe.sauces.map((sauce) => sauce.sauceId),
      extraIds: recipe.extras.map((extra) => extra.extraId),
      inspiredByRecipeId: recipe.id,
    });
  }

  private write(mutator: (draft: ScoopsDatabase) => void): void {
    const draft = structuredClone(this.db);
    mutator(draft);
    this.persist?.(draft);
    this.db = draft;
  }

  private insertStarter(draft: ScoopsDatabase, identity: PlayerIdentity): void {
    const now = new Date().toISOString();
    draft.users.push({ id: identity.id, username: identity.displayName, createdAt: now });
    draft.profiles.push({
      userId: identity.id,
      displayName: identity.displayName,
      avatar: "classic",
      level: 1,
      xp: 0,
      coins: 0,
      recipesCreated: 0,
      recipesDiscovered: 0,
      tutorialSeen: false,
      recipeStar: false,
    });
    for (const row of explicitForLevel(identity.id, 1, now)) draft.unlocks.push(row);
  }

  private profile(draft: ScoopsDatabase, userId: string): DbProfile {
    const profile = draft.profiles.find((row) => row.userId === userId);
    if (!profile) throw new ScoopsRuleError(401, "Sign in with your nickname first!");
    return profile;
  }

  private visible(draft: ScoopsDatabase, userId: string, id: string): DbRecipe {
    const row = draft.recipes.find((recipe) => recipe.id === id);
    if (!row || !canSee(row, userId)) throw new ScoopsRuleError(404, NOT_FOUND);
    return row;
  }

  private holds(draft: ScoopsDatabase, userId: string, kind: Exclude<UnlockKind, "avatar">, id: string): void {
    const profile = this.profile(draft, userId);
    const item = lookup(kind, id);
    if (!item) throw new ScoopsRuleError(400, "Shelby doesn't carry that ingredient.");
    if (!isAvailable(item, profile.level, explicitIds(draft, userId, kind))) {
      throw new ScoopsRuleError(400, LOCKED(item.name));
    }
  }

  private saveInto(draft: ScoopsDatabase, identity: PlayerIdentity, existing: DbRecipe | null, input: SaveRecipeInput): SaveResult {
    const text = moderateRecipeText(input.name, input.description);
    if (!text.ok) throw new ScoopsRuleError(400, text.message);
    if (!input.containerId) throw new ScoopsRuleError(400, "Pick a cone or a cup.");
    if (input.flavorIds.length === 0) throw new ScoopsRuleError(400, "Pick at least one flavor.");
    if (input.flavorIds.length > MIX_MAX[input.mix]) throw new ScoopsRuleError(400, "That's too many scoops for that style.");
    this.holds(draft, identity.id, "container", input.containerId);
    for (const id of input.flavorIds) this.holds(draft, identity.id, "flavor", id);
    for (const id of input.toppingIds) this.holds(draft, identity.id, "topping", id);
    for (const id of input.sauceIds) this.holds(draft, identity.id, "sauce", id);
    for (const id of input.extraIds) this.holds(draft, identity.id, "extra", id);
    const container = catalog.containerById.get(input.containerId);
    if (!container) throw new ScoopsRuleError(400, "Pick a cone or a cup.");

    const creation = creationOf(input);
    const profile = this.profile(draft, identity.id);
    const known = draft.discoveries.filter((row) => row.userId === identity.id).map((row) => row.secretId);
    const fresh = matchingSecrets(creation).filter((secret) => !known.includes(secret.id));
    const event = this.currentEvent(draft, identity.id);
    const score = scoreCreation(creation, existing ? "edit" : "create", fresh.map((secret) => secret.id), event);
    const now = new Date().toISOString();
    const levelBefore = profile.level;
    const grants = this.applyXp(draft, identity.id, score.xp, score.coins, now);
    for (const secret of fresh) {
      draft.discoveries.push({ userId: identity.id, secretId: secret.id, discoveredAt: now });
    }
    profile.recipesDiscovered += fresh.length;
    if (!existing) profile.recipesCreated += 1;
    if (score.eventCompleted && event) this.completeEvent(draft, identity.id, event.id, event.date);
    const badges = evaluateAchievements({
      recipesCreated: profile.recipesCreated,
      recipeStar: profile.recipeStar,
      discoveries: draft.discoveries.filter((row) => row.userId === identity.id).map((row) => row.secretId),
      creation,
      already: draft.achievements.filter((row) => row.userId === identity.id).map((row) => row.achievementId),
    });
    for (const badge of badges) draft.achievements.push({ userId: identity.id, achievementId: badge.id, unlockedAt: now });

    const ownedAvatars = new Set(draft.unlocks.filter((row) => row.userId === identity.id && row.kind === "avatar").map((row) => row.itemId));
    const wonAvatars = avatarPrizesEarned({ creation, recipesCreated: profile.recipesCreated }, ownedAvatars);
    for (const avatar of wonAvatars) {
      draft.unlocks.push({ userId: identity.id, kind: "avatar", itemId: avatar.id, unlockedAt: now });
    }
    if (wonAvatars.length > 0) profile.avatar = wonAvatars[wonAvatars.length - 1]!.id;

    const credit = this.attribution(draft, identity.id, input.inspiredByRecipeId, existing);
    const recipeId = existing?.id ?? newId("recipe");
    const row: DbRecipe = {
      id: recipeId,
      ownerUserId: identity.id,
      name: text.name,
      description: text.description,
      containerType: container.serve,
      containerId: input.containerId,
      mix: input.mix,
      isPublic: input.isPublic,
      inspiredByRecipeId: credit?.id ?? null,
      inspiredByName: credit?.name ?? null,
      inspiredByOwner: credit?.owner ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      timesMade: (existing?.timesMade ?? 0) + 1,
      favoriteCount: existing?.favoriteCount ?? 0,
      shelbyFavorite: existing?.shelbyFavorite ?? false,
    };
    if (existing) {
      this.detach(draft, existing.id);
      const index = draft.recipes.findIndex((recipe) => recipe.id === existing.id);
      draft.recipes[index] = row;
    } else {
      draft.recipes.push(row);
    }
    this.attach(draft, recipeId, input);
    const saved = toRecipe(draft, row);
    return {
      recipe: saved,
      session: this.sessionFrom(draft, identity.id),
      rewards: {
        xp: score.xp,
        coins: score.coins,
        levelBefore,
        levelAfter: profile.level,
        unlocked: grants,
        achievements: badges.map((badge) => ({ id: badge.id, name: badge.name, emoji: badge.emoji, description: badge.description })),
        discoveries: fresh.map((secret) => ({ id: secret.id, name: secret.name, emoji: secret.emoji, description: secret.description })),
        avatars: wonAvatars.map((avatar) => ({ id: avatar.id, name: avatar.name, emoji: avatar.emoji, blurb: avatar.blurb, prize: avatar.prize ?? "" })),
        eventNote: score.eventNote,
      },
    };
  }

  private attribution(
    draft: ScoopsDatabase,
    userId: string,
    requested: string | undefined,
    previous: DbRecipe | null,
  ): { id: string; name: string; owner: string } | null {
    const id = requested ?? previous?.inspiredByRecipeId ?? undefined;
    if (!id) return null;
    const source = draft.recipes.find((recipe) => recipe.id === id);
    if (!source || !canSee(source, userId)) {
      if (requested) throw new ScoopsRuleError(404, "Shelby can't find that recipe to copy.");
      if (previous?.inspiredByName && previous.inspiredByOwner) {
        return { id, name: previous.inspiredByName, owner: previous.inspiredByOwner };
      }
      return null;
    }
    const owner = draft.profiles.find((profile) => profile.userId === source.ownerUserId);
    return { id: source.id, name: source.name, owner: owner?.displayName ?? "Scooper" };
  }

  private applyXp(draft: ScoopsDatabase, userId: string, xp: number, coins: number, now: string): SaveResult["rewards"]["unlocked"] {
    const profile = this.profile(draft, userId);
    const before = profile.level;
    profile.xp += xp;
    profile.coins += coins;
    profile.level = levelForXp(profile.xp);
    const held = new Set(draft.unlocks.filter((row) => row.userId === userId).map((row) => row.itemId));
    const opened = unlocksBetween(before, profile.level, held);
    for (const grant of opened) {
      if (!draft.unlocks.some((row) => row.userId === userId && row.kind === grant.kind && row.itemId === grant.id)) {
        draft.unlocks.push({ userId, kind: grant.kind, itemId: grant.id, unlockedAt: now });
      }
    }
    return opened;
  }

  private awardRecipeStar(draft: ScoopsDatabase, ownerId: string, now: string): string | null {
    const profile = draft.profiles.find((row) => row.userId === ownerId);
    if (!profile || profile.recipeStar) return null;
    profile.recipeStar = true;
    const badges = evaluateAchievements({
      recipesCreated: profile.recipesCreated,
      recipeStar: true,
      discoveries: draft.discoveries.filter((row) => row.userId === ownerId).map((row) => row.secretId),
      creation: null,
      already: draft.achievements.filter((row) => row.userId === ownerId).map((row) => row.achievementId),
    });
    let note: string | null = null;
    for (const badge of badges) {
      draft.achievements.push({ userId: ownerId, achievementId: badge.id, unlockedAt: now });
      if (badge.id === "recipe-star") note = `${profile.displayName} earned Recipe Star!`;
    }
    return note;
  }

  private currentEvent(draft: ScoopsDatabase, userId: string) {
    const date = todayKey();
    const done = draft.events.filter((row) => row.userId === userId && row.date === date && row.completed).map((row) => row.eventId);
    const unlocks = unlockSet(draft, userId);
    return eventForUser(date, userId, unlocks, done);
  }

  private completeEvent(draft: ScoopsDatabase, userId: string, eventId: string, date: string): void {
    const existing = draft.events.find((row) => row.userId === userId && row.date === date && row.eventId === eventId);
    if (existing) existing.completed = true;
    else draft.events.push({ userId, date, eventId, completed: true });
  }

  private attach(draft: ScoopsDatabase, recipeId: string, input: SaveRecipeInput): void {
    input.flavorIds.forEach((flavorId, position) => draft.recipeFlavors.push({ recipeId, flavorId, position }));
    input.toppingIds.forEach((toppingId, position) => draft.recipeToppings.push({ recipeId, toppingId, position }));
    input.sauceIds.forEach((sauceId, position) => draft.recipeSauces.push({ recipeId, sauceId, position }));
    input.extraIds.forEach((extraId, position) => draft.recipeExtras.push({ recipeId, extraId, position }));
  }

  private detach(draft: ScoopsDatabase, recipeId: string): void {
    draft.recipeFlavors = draft.recipeFlavors.filter((row) => row.recipeId !== recipeId);
    draft.recipeToppings = draft.recipeToppings.filter((row) => row.recipeId !== recipeId);
    draft.recipeSauces = draft.recipeSauces.filter((row) => row.recipeId !== recipeId);
    draft.recipeExtras = draft.recipeExtras.filter((row) => row.recipeId !== recipeId);
  }

  private sessionFrom(db: ScoopsDatabase, userId: string): ScoopSession {
    const profile = db.profiles.find((row) => row.userId === userId);
    const user = db.users.find((row) => row.id === userId);
    if (!profile || !user) throw new ScoopsRuleError(401, "Sign in with your nickname first!");
    const recipes = sortRecipes(
      db.recipes.filter((recipe) => recipe.ownerUserId === userId).map((recipe) => toRecipe(db, recipe)),
      "newest",
    );
    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: profile.displayName,
        avatar: profile.avatar,
        level: profile.level,
        xp: profile.xp,
        coins: profile.coins,
        recipesCreated: profile.recipesCreated,
        recipesDiscovered: profile.recipesDiscovered,
        createdAt: user.createdAt,
      },
      unlocks: unlockSet(db, userId),
      achievements: db.achievements
        .filter((row) => row.userId === userId)
        .map((row) => ({ id: row.achievementId, unlockedAt: row.unlockedAt })),
      discoveries: db.discoveries.filter((row) => row.userId === userId).map((row) => row.secretId),
      recipes,
      favoriteIds: db.favorites.filter((row) => row.userId === userId).map((row) => row.recipeId),
      event: this.currentEvent(db, userId),
      tutorialSeen: profile.tutorialSeen,
    };
  }
}

function lookup(kind: Exclude<UnlockKind, "avatar">, id: string): { id: string; name: string; unlockLevel: number; unlockedByDefault: boolean } | null {
  switch (kind) {
    case "flavor":
      return catalog.flavorById.get(id) ?? null;
    case "container":
      return catalog.containerById.get(id) ?? null;
    case "topping":
      return catalog.toppingById.get(id) ?? null;
    case "sauce":
      return catalog.sauceById.get(id) ?? null;
    case "extra":
      return catalog.extraById.get(id) ?? null;
    default:
      return null;
  }
}

function explicitForLevel(userId: string, level: number, now: string): { userId: string; kind: UnlockKind; itemId: string; unlockedAt: string }[] {
  const rows: { userId: string; kind: UnlockKind; itemId: string; unlockedAt: string }[] = [];
  const kinds: UnlockKind[] = ["flavor", "container", "topping", "sauce", "extra", "avatar"];
  for (const kind of kinds) {
    const table = kind === "flavor" ? catalog.flavors
      : kind === "container" ? catalog.containers
        : kind === "topping" ? catalog.toppings
          : kind === "sauce" ? catalog.sauces
            : kind === "extra" ? catalog.extras
              : catalog.avatars;
    for (const item of table) {
      if (item.unlockedByDefault || level >= item.unlockLevel) {
        rows.push({ userId, kind, itemId: item.id, unlockedAt: now });
      }
    }
  }
  return rows;
}
