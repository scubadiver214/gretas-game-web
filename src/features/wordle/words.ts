/**
 * Curated word banks for the kids' word game. Every word is short and common
 * enough that a 6-10 year old should recognise it on sight - no obscure or
 * tricky spellings. Kept lowercase; scoring.ts compares case-insensitively.
 */

export type WordLength = 3 | 4 | 5;

const WORDS_3: readonly string[] = [
  "cat", "dog", "sun", "hat", "box", "cup", "pen", "bee", "fox", "owl",
  "bat", "pig", "hen", "ant", "egg", "bed", "cow", "fan", "jar", "key",
  "log", "mud", "net", "rat", "van", "zoo", "bug", "cap", "bus", "gum",
  "hop", "jam", "mop", "mug", "pot", "run", "sit", "top", "wet", "yes",
];

const WORDS_4: readonly string[] = [
  "frog", "lion", "bear", "fish", "bird", "star", "moon", "cake", "book", "ball",
  "tree", "kite", "milk", "rain", "snow", "wind", "gold", "blue", "pink", "jump",
  "swim", "play", "sing", "walk", "ride", "cool", "warm", "kind", "calm", "loud",
  "soft", "hard", "fast", "slow", "bike", "boat", "cave", "desk", "door", "farm",
  "fire", "girl", "hand", "hero", "kids", "lamp", "leaf", "lake", "moss", "nest",
  "nose", "pear", "plum", "ring", "road", "rock", "rope", "sand", "seed", "ship",
  "shoe", "sock", "song", "tail", "wave", "wolf", "wool", "yard", "zero",
];

const WORDS_5: readonly string[] = [
  "apple", "mango", "grape", "lemon", "peach", "candy", "sweet", "smile", "happy", "funny",
  "giant", "tiger", "panda", "koala", "zebra", "camel", "whale", "shark", "eagle", "robin",
  "ocean", "beach", "cloud", "storm", "plant", "house", "mouse", "horse", "sheep", "goose",
  "snake", "music", "dance", "paint", "chair", "table", "light", "night", "water", "bread",
  "pizza", "juice", "fruit", "berry", "melon", "plane", "train", "truck", "boots", "shirt",
  "pants", "socks", "shoes", "dress", "heart", "magic", "quiet", "quick", "brave", "proud",
  "sunny", "rainy", "river", "world", "earth", "space", "stars", "moons", "seeds", "roots",
  "trunk", "petal", "thorn",
];

export const WORDS_BY_LENGTH: Readonly<Record<WordLength, readonly string[]>> = {
  3: WORDS_3,
  4: WORDS_4,
  5: WORDS_5,
};
