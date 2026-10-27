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
  /** Only flying mallards are game targets; everything else is protected. */
  protected: boolean;
}

export const SPECIES: readonly SpeciesDef[] = [
  {
    id: "mallard",
    name: "Mallard",
    emoji: "🦆",
    rarity: "common",
    hint: "Flies over the lake and swims by the reeds.",
    fact: "Only female mallards make the loud “quack!” The green-headed males make a soft, raspy sound.",
    protected: false,
  },
  {
    id: "woodDuck",
    name: "Wood Duck",
    emoji: "🦆",
    rarity: "uncommon",
    hint: "A very colourful duck that hides near the left reeds.",
    fact: "Wood ducks nest in tree holes. Their fluffy ducklings jump out and bounce safely to the ground!",
    protected: true,
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
