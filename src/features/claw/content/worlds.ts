/**
 * Arcade worlds: ten levels each, with their own colours, prize pool and a
 * mystery machine that opens once the world's last level is cleared.
 */

export type WorldId = "toybox" | "candy" | "jungle" | "space" | "rainbow";

export interface WorldPalette {
  /** Cabinet body. */
  cabinet: string;
  /** Trim, rails and the marquee frame. */
  trim: string;
  /** Marquee bulbs and the neon accent used in the UI. */
  glow: string;
  /** Cabinet floor under the toys. */
  floor: string;
  /** Back wall inside the cabinet. */
  backdrop: string;
  /** Scene background. */
  sky: string;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  blurb: string;
  from: number;
  to: number;
  palette: WorldPalette;
  /** Prize ids this world's machines draw from; each level filters by unlock level. */
  prizes: readonly string[];
  /** Legendary prize behind the world's mystery machine. */
  mysteryPrize: string;
  /** Avatar unlocked by winning the mystery prize. */
  avatar: string;
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: "toybox",
    name: "Toy Box Arcade",
    blurb: "Teddy bears, slime and yo-yos in a bright pastel arcade.",
    from: 1,
    to: 10,
    palette: { cabinet: "#FF6F91", trim: "#FFD54D", glow: "#FFD54D", floor: "#9AD4FF", backdrop: "#FFE3F1", sky: "#1A1430" },
    prizes: [
      "teddy-brown", "teddy-pink", "slime-green", "slime-pink", "slime-blue", "yoyo-red", "duck-yellow", "ball-rainbow", "ball-blue",
      "car-red", "car-blue", "dino-green", "brush-purple", "pen-troll-orange", "plane-white", "ring-pink", "eraser-strawberry", "plane-red",
      "slime-glitter", "car-race", "teddy-big", "yoyo-rainbow", "glow-star",
      "bunny-white", "duck-blue", "top-red", "cupcake-pink", "penguin-small", "car-green", "yoyo-blue", "icecream-mint", "ball-star",
      "slime-orange", "teddy-blue", "pen-troll-green", "panda-plush", "octopus-plush",
      "puppy-tan", "kitty-orange", "frog-green", "chick-yellow", "donut-pink", "lollipop-red", "heart-red", "bee-stripe",
      "turtle-green", "train-red", "owl-brown", "fox-orange", "puppy-spot", "kitty-grey", "monkey-plush", "helicopter-red",
      "pig-pink", "mouse-grey", "balloon-red", "cookie-choc", "mushroom-red", "flower-yellow", "fish-orange", "ladybug-red",
      "drum-blue", "boat-white", "koala-grey", "lion-tan", "elephant-grey", "pig-sparkle", "balloon-rainbow", "flower-pink",
    ],
    mysteryPrize: "teddy-golden",
    avatar: "race-driver",
  },
  {
    id: "candy",
    name: "Candy Carnival",
    blurb: "Candy-coloured machines full of glitter slime, squishies and unicorns.",
    from: 11,
    to: 20,
    palette: { cabinet: "#FF4FD8", trim: "#FFFFFF", glow: "#41C9FF", floor: "#FFF1B8", backdrop: "#FFD0E6", sky: "#2A0F2E" },
    prizes: [
      "slime-glitter", "squishy-cat", "unicorn-plush", "fidget-pop", "yoyo-rainbow", "glow-star", "teddy-pink", "teddy-big", "ring-pink",
      "eraser-strawberry", "slime-pink", "duck-pirate", "car-race", "dino-plush", "robot-mini", "rocket-toy",
      "cupcake-pink", "cupcake-sprinkle", "icecream-mint", "icecream-rainbow", "bunny-squishy", "top-rainbow", "panda-plush",
      "octopus-plush", "penguin-glow", "dino-blue", "car-police",
      "donut-pink", "donut-choc", "lollipop-red", "heart-red", "kitty-orange", "kitty-grey", "puppy-spot", "chick-yellow",
      "gem-sapphire", "owl-snow", "frog-blue", "ufo-saucer", "whale-blue", "train-steam", "bee-sparkle", "turtle-sea", "fox-arctic",
      "fish-glow", "cookie-sprinkle", "boat-pirate", "drum-rainbow", "crown-gold", "mushroom-glow", "koala-sleepy", "ladybug-gold",
    ],
    mysteryPrize: "unicorn-giant",
    avatar: "sparkly-princess",
  },
  {
    id: "jungle",
    name: "Dinosaur Jungle",
    blurb: "Leafy machines, dinosaur toys and a few sneaky obstacles.",
    from: 21,
    to: 30,
    palette: { cabinet: "#3FA34D", trim: "#FFB347", glow: "#B6FF3B", floor: "#C8A96B", backdrop: "#C8F560", sky: "#0B2415" },
    prizes: [
      "dino-green", "dino-plush", "teddy-giant", "car-gold", "unicorn-rainbow", "pen-troll-special", "slime-sparkle-set", "slime-green",
      "squishy-cat", "duck-pirate", "glow-star", "fidget-pop", "rocket-toy", "robot-mini", "dragon-plush",
      "octopus-glow", "panda-giant", "dino-blue", "penguin-glow", "bunny-squishy", "icecream-rainbow", "panda-plush",
      "frog-green", "frog-blue", "monkey-plush", "turtle-green", "turtle-sea", "fox-orange", "fox-arctic", "bee-stripe",
      "bee-sparkle", "owl-brown", "owl-snow", "kitty-rainbow", "helicopter-sky", "gem-ruby", "whale-glow",
      "lion-mane", "elephant-big", "balloon-galaxy", "crown-ruby", "koala-sleepy", "mushroom-glow", "ladybug-gold",
    ],
    mysteryPrize: "dragon-rainbow",
    avatar: "silly-dino",
  },
  {
    id: "space",
    name: "Space Toy Station",
    blurb: "Robots, rockets and glowing stars in a futuristic machine.",
    from: 31,
    to: 40,
    palette: { cabinet: "#3B82F6", trim: "#B78AFF", glow: "#41C9FF", floor: "#24314B", backdrop: "#0F1624", sky: "#05070F" },
    prizes: [
      "robot-mini", "robot-animated", "rocket-toy", "plane-red", "glow-star", "star-glow-big", "dino-glow", "dragon-plush", "slime-glitter",
      "car-gold", "fidget-pop", "teddy-giant", "unicorn-rainbow",
      "penguin-king", "icecream-galaxy", "rocket-gold", "octopus-glow", "car-police", "top-rainbow", "penguin-glow",
      "ufo-saucer", "ufo-glow", "helicopter-red", "helicopter-sky", "whale-blue", "whale-glow", "gem-sapphire", "gem-ruby",
      "owl-night", "heart-crystal", "monkey-king", "train-steam",
      "fish-rainbow", "koala-crystal", "boat-gold", "flower-crystal", "balloon-galaxy", "fish-glow",
    ],
    mysteryPrize: "robot-hero",
    avatar: "astronaut",
  },
  {
    id: "rainbow",
    name: "Rainbow Treasure Arcade",
    blurb: "Golden machines, rare toys and the biggest celebrations.",
    from: 41,
    to: 50,
    palette: { cabinet: "#FFD54D", trim: "#FF4FD8", glow: "#3DFF88", floor: "#FFF1B8", backdrop: "#B78AFF", sky: "#1A0B2E" },
    prizes: [
      "teddy-giant", "car-gold", "unicorn-rainbow", "pen-troll-special", "slime-sparkle-set", "robot-animated", "dragon-plush", "dino-glow",
      "star-glow-big", "slime-crystal", "car-gold-race", "yoyo-rainbow", "glow-star",
      "bunny-crystal", "octopus-rainbow", "rocket-gold", "panda-giant", "icecream-galaxy", "penguin-king", "octopus-glow",
      "puppy-golden", "gem-rainbow", "heart-gold", "whale-star", "kitty-rainbow", "heart-crystal", "gem-ruby", "owl-night",
      "monkey-king", "ufo-glow",
      "lion-golden", "crown-rainbow", "elephant-sparkle", "balloon-gold", "crown-ruby", "flower-crystal",
    ],
    mysteryPrize: "chest-mystery",
    avatar: "pirate-puppy",
  },
];

export const WORLD_BY_ID: Readonly<Record<WorldId, WorldDef>> = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, WorldDef>;

export function worldFor(level: number): WorldDef {
  return WORLDS.find((w) => level >= w.from && level <= w.to) ?? WORLDS[WORLDS.length - 1];
}
