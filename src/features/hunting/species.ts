import type { Rarity, SpeciesId } from "./types";

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  emoji: string;
  rarity: Rarity;
  /** Where to look, shown before the species is discovered. */
  hint: string;
  /** A kid-sized fact, revealed with the first photo. */
  fact: string;
  /** Swimming birds and other wildlife are protected. Ducks in the air are targets. */
  protected: boolean;
}

export const SPECIES: readonly SpeciesDef[] = [
  {
    id: "mallard",
    name: "Mallard",
    emoji: "🦆",
    rarity: "common",
    hint: "The green-headed duck. Flocks fly over the lake and a few swim by the reeds.",
    fact: "Only female mallards make the loud “quack!” The green-headed males make a soft, raspy sound.",
    protected: false,
  },
  {
    id: "woodDuck",
    name: "Wood Duck",
    emoji: "🦆",
    rarity: "uncommon",
    hint: "A very colourful duck. Some hide near the left reeds, and some fly past.",
    fact: "Wood ducks nest in tree holes. Their fluffy ducklings jump out and bounce safely to the ground!",
    protected: true,
  },
  {
    id: "pintail",
    name: "Northern Pintail",
    emoji: "🦆",
    rarity: "uncommon",
    hint: "A slim duck with a long pointed tail. Look for a line or an echelon.",
    fact: "A pintail drake's tail is long and thin, like a pin. Pintails are among the fastest ducks.",
    protected: false,
  },
  {
    id: "teal",
    name: "Green-winged Teal",
    emoji: "🦆",
    rarity: "common",
    hint: "The smallest duck. Watch for a fast flock skimming low over the water.",
    fact: "Green-winged teal are tiny, and a whole flock can twist and turn together like a school of fish.",
    protected: false,
  },
  {
    id: "canvasback",
    name: "Canvasback",
    emoji: "🦆",
    rarity: "rare",
    hint: "A big duck with a chestnut head and a white body. Often the highest bird in a stack.",
    fact: "Canvasbacks dive for plants on the lake bottom. Their forehead slopes in a straight line into a long bill.",
    protected: false,
  },
  {
    id: "shoveler",
    name: "Northern Shoveler",
    emoji: "🦆",
    rarity: "uncommon",
    hint: "A duck with a huge spoon-shaped bill. Its flock sometimes splits apart mid-flight.",
    fact: "A shoveler's bill is shaped like a spoon. It swings that bill side to side to strain tiny animals from the water.",
    protected: false,
  },
  {
    id: "swan",
    name: "Mute Swan",
    emoji: "🦢",
    rarity: "uncommon",
    hint: "Two big white birds glide out in the middle of the lake.",
    fact: "A swan can weigh as much as a big turkey, and it still flies!",
    protected: true,
  },
  {
    id: "heron",
    name: "Great Blue Heron",
    emoji: "🪶",
    rarity: "uncommon",
    hint: "Stands very still in the shallow water.",
    fact: "Herons stand perfectly still, then strike like lightning to catch a fish.",
    protected: true,
  },
  {
    id: "turtle",
    name: "Painted Turtle",
    emoji: "🐢",
    rarity: "common",
    hint: "Likes to sunbathe on a log near the shore.",
    fact: "Turtles sunbathe to warm up, because they can't make their own body heat.",
    protected: true,
  },
  {
    id: "frog",
    name: "Green Frog",
    emoji: "🐸",
    rarity: "common",
    hint: "Tiny! Look closely at the lily pads and zoom in.",
    fact: "A green frog's call sounds like a loose banjo string: “gunk!”",
    protected: true,
  },
  {
    id: "kingfisher",
    name: "Belted Kingfisher",
    emoji: "🐦",
    rarity: "rare",
    hint: "A rare visitor. Watch the dead branch sticking out of the water.",
    fact: "Kingfishers hover in the air, then dive headfirst into the water to catch fish.",
    protected: true,
  },
  {
    id: "loon",
    name: "Common Loon",
    emoji: "🐦",
    rarity: "rare",
    hint: "Swims far out and disappears underwater for a long time.",
    fact: "Loons can dive deeper than a 20-storey building is tall!",
    protected: true,
  },
];

export const SPECIES_BY_ID: Record<SpeciesId, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s])) as Record<SpeciesId, SpeciesDef>;

export const RARITY_LABEL: Record<Rarity, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare" };

/** Friendly reminder when a pellet lands near protected wildlife. */
export function protectedMessage(id: SpeciesId): string {
  const s = SPECIES_BY_ID[id];
  if (id === "mallard") return "We only aim at ducks in the air. Let that one swim!";
  return `That's a ${s.name}. It's protected, so let's take its photo instead! 📷`;
}
