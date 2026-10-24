import { POINTS } from "../config";
import type { Rarity, ToyTemplate } from "../engine/types";

/**
 * The prize catalog. Adding a toy is a new entry here (plus, optionally, a
 * model builder in render/toys); the engine, collection screens and the API
 * all read this list. Sizes are bounding-sphere radii in world units (the
 * jaw reaches 0.6, so anything wider is a genuinely hard grab).
 */

export type PrizeCategory = "plush" | "slime" | "vehicle" | "toy" | "novelty" | "creature" | "robot" | "treasure";

/** Procedural model builders in render/toys. Unknown ids fall back to "generic". */
export type ToyModelId =
  | "teddy"
  | "duck"
  | "ball"
  | "car"
  | "slime"
  | "dino"
  | "yoyo"
  | "brush"
  | "pen"
  | "plane"
  | "ring"
  | "eraser"
  | "star"
  | "unicorn"
  | "fidget"
  | "squishy"
  | "robot"
  | "rocket"
  | "dragon"
  | "chest"
  | "bunny"
  | "penguin"
  | "panda"
  | "octopus"
  | "cupcake"
  | "icecream"
  | "top"
  | "puppy"
  | "kitty"
  | "frog"
  | "monkey"
  | "owl"
  | "fox"
  | "chick"
  | "turtle"
  | "bee"
  | "whale"
  | "helicopter"
  | "train"
  | "donut"
  | "lollipop"
  | "gem"
  | "heart"
  | "ufo"
  | "pig"
  | "elephant"
  | "mouse"
  | "lion"
  | "fish"
  | "ladybug"
  | "cookie"
  | "balloon"
  | "mushroom"
  | "flower"
  | "boat"
  | "crown"
  | "drum"
  | "koala"
  | "generic";

export interface PrizeDef extends ToyTemplate {
  name: string;
  description: string;
  category: PrizeCategory;
  points: number;
  /** First level this prize can show up on (mirrored by the API). */
  unlockLevel: number;
  model: ToyModelId;
  /** [body, secondary, accent] hex colours for the model. */
  palette: [string, string, string];
  /** Optional glTF to use instead of the procedural model (public/ path). */
  asset?: { glb: string };
  /** Only ever offered by a world's mystery machine. */
  mysteryOnly?: boolean;
  /** Glow-in-the-dark / sparkly finish for the renderer. */
  finish?: "glow" | "sparkle" | "gold" | "crystal";
}

type Spec = Omit<PrizeDef, "points"> & { points?: number };

function prize(spec: Spec): PrizeDef {
  return { ...spec, points: spec.points ?? POINTS[spec.rarity] };
}

export const PRIZES: readonly PrizeDef[] = [
  // --- common ---------------------------------------------------------------
  prize({ id: "slime-green", name: "Green Slime", description: "Gooey, stretchy and very green.", category: "slime", rarity: "common", size: 0.32, weight: 0.35, gripDifficulty: 0.45, unlockLevel: 1, model: "slime", palette: ["#5EE86A", "#2FB84A", "#FFFFFF"] }),
  prize({ id: "slime-pink", name: "Pink Slime", description: "Smells like strawberries (probably).", category: "slime", rarity: "common", size: 0.32, weight: 0.35, gripDifficulty: 0.45, unlockLevel: 1, model: "slime", palette: ["#FF8AD0", "#E85D9A", "#FFFFFF"] }),
  prize({ id: "teddy-brown", name: "Little Bear", description: "A small bear with a big smile.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.1, unlockLevel: 1, model: "teddy", palette: ["#B5733A", "#E8B47A", "#2B2D42"] }),
  prize({ id: "teddy-pink", name: "Pink Bear", description: "Soft, pink and ready for a hug.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.1, unlockLevel: 1, model: "teddy", palette: ["#F28BBE", "#FFD0E6", "#2B2D42"] }),
  prize({ id: "duck-yellow", name: "Rubber Ducky", description: "Squeak! Bath time's best friend.", category: "toy", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 1, model: "duck", palette: ["#FFD43B", "#FF8A3D", "#2B2D42"] }),
  prize({ id: "ball-rainbow", name: "Bouncy Ball", description: "Bounces higher than you'd think.", category: "toy", rarity: "common", size: 0.3, weight: 0.25, gripDifficulty: 0.5, unlockLevel: 1, model: "ball", palette: ["#FF6A57", "#41C9FF", "#FFD54D"] }),
  prize({ id: "yoyo-red", name: "Red Yo-yo", description: "Walk the dog, rock the cradle.", category: "toy", rarity: "common", size: 0.28, weight: 0.25, gripDifficulty: 0.3, unlockLevel: 1, model: "yoyo", palette: ["#E63946", "#FFFFFF", "#2B2D42"] }),
  prize({ id: "car-red", name: "Red Racer", description: "A tiny die-cast racer. Vroom!", category: "vehicle", rarity: "common", size: 0.34, weight: 0.4, gripDifficulty: 0.35, unlockLevel: 1, model: "car", palette: ["#E63946", "#2B2D42", "#FFFFFF"] }),
  prize({ id: "slime-blue", name: "Blue Slime", description: "Cold-looking, but it's just slime.", category: "slime", rarity: "common", size: 0.32, weight: 0.35, gripDifficulty: 0.45, unlockLevel: 2, model: "slime", palette: ["#5BC8FF", "#2E8DEF", "#FFFFFF"] }),
  prize({ id: "car-blue", name: "Blue Zoomer", description: "Zooms around corners.", category: "vehicle", rarity: "common", size: 0.34, weight: 0.4, gripDifficulty: 0.35, unlockLevel: 2, model: "car", palette: ["#3B82F6", "#2B2D42", "#FFFFFF"] }),
  prize({ id: "dino-green", name: "Mini Dino", description: "Roar! A pocket-sized dinosaur.", category: "creature", rarity: "common", size: 0.38, weight: 0.3, gripDifficulty: 0.2, unlockLevel: 2, model: "dino", palette: ["#3FA34D", "#C8F560", "#2B2D42"] }),
  prize({ id: "ball-blue", name: "Blue Bouncer", description: "Super bouncy, super blue.", category: "toy", rarity: "common", size: 0.3, weight: 0.25, gripDifficulty: 0.5, unlockLevel: 2, model: "ball", palette: ["#41C9FF", "#FFFFFF", "#1E8FC9"] }),
  prize({ id: "brush-purple", name: "Sparkle Hairbrush", description: "For hair that needs a little sparkle.", category: "novelty", rarity: "common", size: 0.36, weight: 0.25, gripDifficulty: 0.3, unlockLevel: 3, model: "brush", palette: ["#B78AFF", "#FFFFFF", "#8A4DFF"] }),
  prize({ id: "pen-troll-orange", name: "Troll Pen", description: "A pen with wild, spiky orange hair.", category: "novelty", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 3, model: "pen", palette: ["#FFB347", "#FF6A57", "#F6C9A0"] }),
  prize({ id: "plane-white", name: "Toy Airplane", description: "Ready for take-off.", category: "vehicle", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.4, unlockLevel: 4, model: "plane", palette: ["#FFFFFF", "#41C9FF", "#E63946"] }),
  prize({ id: "ring-pink", name: "Sparkle Ring", description: "A plastic jewel, as big as a grape.", category: "novelty", rarity: "common", size: 0.26, weight: 0.1, gripDifficulty: 0.35, unlockLevel: 4, model: "ring", palette: ["#FF4FD8", "#FFD54D", "#FFFFFF"] }),
  prize({ id: "eraser-strawberry", name: "Strawberry Eraser", description: "Too cute to actually use.", category: "novelty", rarity: "common", size: 0.26, weight: 0.15, gripDifficulty: 0.3, unlockLevel: 5, model: "eraser", palette: ["#FF5A7A", "#3FA34D", "#FFF4E0"] }),
  prize({ id: "plane-red", name: "Red Jet", description: "The fastest plane in the toy box.", category: "vehicle", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.4, unlockLevel: 7, model: "plane", palette: ["#E63946", "#FFFFFF", "#2B2D42"] }),

  // --- uncommon -------------------------------------------------------------
  prize({ id: "slime-glitter", name: "Glitter Slime", description: "Slime with a thousand tiny sparkles.", category: "slime", rarity: "uncommon", size: 0.34, weight: 0.4, gripDifficulty: 0.5, unlockLevel: 6, model: "slime", palette: ["#B78AFF", "#FF4FD8", "#FFFFFF"], finish: "sparkle" }),
  prize({ id: "car-race", name: "Race Car", description: "Number 7, built for the track.", category: "vehicle", rarity: "uncommon", size: 0.38, weight: 0.45, gripDifficulty: 0.35, unlockLevel: 7, model: "car", palette: ["#FFD54D", "#2B2D42", "#E63946"] }),
  prize({ id: "teddy-big", name: "Big Bear", description: "A bear you can lean on.", category: "plush", rarity: "uncommon", size: 0.52, weight: 0.5, gripDifficulty: 0.15, unlockLevel: 8, model: "teddy", palette: ["#8C5A2B", "#D9A66B", "#2B2D42"] }),
  prize({ id: "yoyo-rainbow", name: "Rainbow Yo-yo", description: "Every colour at once when it spins.", category: "toy", rarity: "uncommon", size: 0.3, weight: 0.25, gripDifficulty: 0.3, unlockLevel: 9, model: "yoyo", palette: ["#FF6A57", "#41C9FF", "#FFD54D"] }),
  prize({ id: "glow-star", name: "Glow Star", description: "Glows in the dark all night long.", category: "toy", rarity: "uncommon", size: 0.34, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 10, model: "star", palette: ["#C8F560", "#FFFFFF", "#3DFF88"], finish: "glow" }),
  prize({ id: "unicorn-plush", name: "Unicorn Plush", description: "A unicorn with a golden horn.", category: "plush", rarity: "uncommon", size: 0.46, weight: 0.4, gripDifficulty: 0.15, unlockLevel: 11, model: "unicorn", palette: ["#FFFFFF", "#FF8AD0", "#FFD54D"] }),
  prize({ id: "dino-plush", name: "Dino Plush", description: "The softest T. rex around.", category: "plush", rarity: "uncommon", size: 0.46, weight: 0.4, gripDifficulty: 0.15, unlockLevel: 12, model: "dino", palette: ["#0E9594", "#C8F560", "#2B2D42"] }),
  prize({ id: "fidget-pop", name: "Pop Fidget", description: "Pop, pop, pop. Flip. Pop.", category: "toy", rarity: "uncommon", size: 0.32, weight: 0.2, gripDifficulty: 0.4, unlockLevel: 13, model: "fidget", palette: ["#41C9FF", "#FF4FD8", "#FFD54D"] }),
  prize({ id: "squishy-cat", name: "Squishy Kitty", description: "Squish it and it slowly puffs back up.", category: "toy", rarity: "uncommon", size: 0.36, weight: 0.25, gripDifficulty: 0.35, unlockLevel: 14, model: "squishy", palette: ["#FFD0E6", "#FF8AD0", "#2B2D42"] }),
  prize({ id: "robot-mini", name: "Mini Robot", description: "Beep boop. Friendly, mostly.", category: "robot", rarity: "uncommon", size: 0.38, weight: 0.5, gripDifficulty: 0.3, unlockLevel: 15, model: "robot", palette: ["#9AD4FF", "#2B2D42", "#FF6A57"] }),
  prize({ id: "duck-pirate", name: "Pirate Ducky", description: "Arr! A ducky with an eyepatch.", category: "toy", rarity: "uncommon", size: 0.34, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 16, model: "duck", palette: ["#FFD43B", "#2B2D42", "#E63946"] }),
  prize({ id: "rocket-toy", name: "Toy Rocket", description: "Three, two, one... lift-off!", category: "vehicle", rarity: "uncommon", size: 0.4, weight: 0.35, gripDifficulty: 0.4, unlockLevel: 18, model: "rocket", palette: ["#FFFFFF", "#E63946", "#41C9FF"] }),

  // --- rare -----------------------------------------------------------------
  prize({ id: "teddy-giant", name: "Giant Bear", description: "Bigger than the claw. Good luck!", category: "plush", rarity: "rare", size: 0.68, weight: 0.85, gripDifficulty: 0.2, unlockLevel: 21, model: "teddy", palette: ["#F2B134", "#FFE2A8", "#2B2D42"] }),
  prize({ id: "car-gold", name: "Golden Car", description: "Shiny gold from bumper to bumper.", category: "vehicle", rarity: "rare", size: 0.36, weight: 0.6, gripDifficulty: 0.4, unlockLevel: 23, model: "car", palette: ["#FFD54D", "#B8860B", "#FFFFFF"], finish: "gold" }),
  prize({ id: "unicorn-rainbow", name: "Rainbow Unicorn", description: "A rainbow mane and a sparkly horn.", category: "plush", rarity: "rare", size: 0.5, weight: 0.45, gripDifficulty: 0.2, unlockLevel: 25, model: "unicorn", palette: ["#FFFFFF", "#B78AFF", "#FFD54D"], finish: "sparkle" }),
  prize({ id: "pen-troll-special", name: "Rainbow Troll Pen", description: "Special edition: rainbow hair!", category: "novelty", rarity: "rare", size: 0.34, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 27, model: "pen", palette: ["#FF4FD8", "#41C9FF", "#F6C9A0"], finish: "sparkle" }),
  prize({ id: "slime-sparkle-set", name: "Sparkle Slime Set", description: "Three sparkly slimes in one jar.", category: "slime", rarity: "rare", size: 0.42, weight: 0.55, gripDifficulty: 0.55, unlockLevel: 29, model: "slime", palette: ["#FFD54D", "#FF4FD8", "#41C9FF"], finish: "sparkle" }),
  prize({ id: "robot-animated", name: "Dancing Robot", description: "Dances when you press its nose.", category: "robot", rarity: "rare", size: 0.44, weight: 0.6, gripDifficulty: 0.35, unlockLevel: 31, model: "robot", palette: ["#FF6A57", "#2B2D42", "#41C9FF"] }),
  prize({ id: "dragon-plush", name: "Magic Dragon", description: "A friendly dragon with tiny wings.", category: "plush", rarity: "rare", size: 0.52, weight: 0.5, gripDifficulty: 0.2, unlockLevel: 33, model: "dragon", palette: ["#7C3AED", "#C8F560", "#FFD54D"] }),
  prize({ id: "dino-glow", name: "Glow Dino", description: "A dinosaur that glows in the dark.", category: "creature", rarity: "rare", size: 0.42, weight: 0.35, gripDifficulty: 0.25, unlockLevel: 35, model: "dino", palette: ["#C8F560", "#FFFFFF", "#2B2D42"], finish: "glow" }),
  prize({ id: "star-glow-big", name: "Giant Glow Star", description: "Lights up a whole bedroom.", category: "toy", rarity: "rare", size: 0.46, weight: 0.3, gripDifficulty: 0.3, unlockLevel: 37, model: "star", palette: ["#FFD54D", "#FFFFFF", "#FFB347"], finish: "glow" }),

  // --- legendary ------------------------------------------------------------
  prize({ id: "teddy-golden", name: "Golden Teddy", description: "A bear made of pure gold (plush).", category: "plush", rarity: "legendary", size: 0.6, weight: 0.8, gripDifficulty: 0.25, unlockLevel: 10, model: "teddy", palette: ["#FFD54D", "#FFF1B8", "#B8860B"], finish: "gold", mysteryOnly: true }),
  prize({ id: "unicorn-giant", name: "Giant Sparkle Unicorn", description: "The biggest, sparkliest unicorn ever.", category: "plush", rarity: "legendary", size: 0.7, weight: 0.9, gripDifficulty: 0.25, unlockLevel: 20, model: "unicorn", palette: ["#FFFFFF", "#FF4FD8", "#FFD54D"], finish: "sparkle", mysteryOnly: true }),
  prize({ id: "dragon-rainbow", name: "Rainbow Dragon", description: "Every scale a different colour.", category: "plush", rarity: "legendary", size: 0.58, weight: 0.65, gripDifficulty: 0.25, unlockLevel: 30, model: "dragon", palette: ["#FF6A57", "#41C9FF", "#FFD54D"], finish: "sparkle", mysteryOnly: true }),
  prize({ id: "robot-hero", name: "Superhero Robot", description: "Cape included. Flight not guaranteed.", category: "robot", rarity: "legendary", size: 0.5, weight: 0.7, gripDifficulty: 0.35, unlockLevel: 40, model: "robot", palette: ["#3B82F6", "#E63946", "#FFD54D"], finish: "gold", mysteryOnly: true }),
  prize({ id: "chest-mystery", name: "Mystery Treasure Chest", description: "What's inside? Only you will know.", category: "treasure", rarity: "legendary", size: 0.5, weight: 0.7, gripDifficulty: 0.3, unlockLevel: 50, model: "chest", palette: ["#8C5A2B", "#FFD54D", "#FF4FD8"], finish: "gold", mysteryOnly: true }),
  prize({ id: "slime-crystal", name: "Crystal Slime", description: "Clear as glass, sparkles like a gem.", category: "slime", rarity: "legendary", size: 0.38, weight: 0.5, gripDifficulty: 0.6, unlockLevel: 47, model: "slime", palette: ["#BFE7FF", "#FFFFFF", "#41C9FF"], finish: "crystal" }),
  prize({ id: "car-gold-race", name: "Golden Race Car", description: "The champion's car, in gold.", category: "vehicle", rarity: "legendary", size: 0.4, weight: 0.65, gripDifficulty: 0.4, unlockLevel: 49, model: "car", palette: ["#FFD54D", "#B8860B", "#E63946"], finish: "gold" }),

  // --- second wave: more toys to pick from in every machine -------------------
  prize({ id: "bunny-white", name: "Fluffy Bunny", description: "Floppy ears and a cotton tail.", category: "plush", rarity: "common", size: 0.4, weight: 0.28, gripDifficulty: 0.12, unlockLevel: 1, model: "bunny", palette: ["#FFFFFF", "#FFC2DA", "#2B2D42"] }),
  prize({ id: "duck-blue", name: "Blue Ducky", description: "A ducky that matches the bath water.", category: "toy", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 1, model: "duck", palette: ["#7FD3FF", "#FF8A3D", "#2B2D42"] }),
  prize({ id: "top-red", name: "Spinning Top", description: "Give it a twist and watch it whirl.", category: "toy", rarity: "common", size: 0.3, weight: 0.22, gripDifficulty: 0.45, unlockLevel: 1, model: "top", palette: ["#E63946", "#FFD54D", "#FFFFFF"] }),
  prize({ id: "cupcake-pink", name: "Cupcake Squishy", description: "Smells sweet. Do not eat!", category: "toy", rarity: "common", size: 0.33, weight: 0.2, gripDifficulty: 0.3, unlockLevel: 2, model: "cupcake", palette: ["#FFB3D9", "#F2B134", "#E63946"] }),
  prize({ id: "penguin-small", name: "Little Penguin", description: "Waddles over for a cuddle.", category: "plush", rarity: "common", size: 0.38, weight: 0.3, gripDifficulty: 0.15, unlockLevel: 2, model: "penguin", palette: ["#2B2D42", "#FFFFFF", "#FF8A3D"] }),
  prize({ id: "car-green", name: "Green Buggy", description: "Bumpy roads? No problem.", category: "vehicle", rarity: "common", size: 0.34, weight: 0.4, gripDifficulty: 0.35, unlockLevel: 3, model: "car", palette: ["#3FA34D", "#2B2D42", "#FFFFFF"] }),
  prize({ id: "yoyo-blue", name: "Blue Yo-yo", description: "Up, down, up, down, around!", category: "toy", rarity: "common", size: 0.28, weight: 0.25, gripDifficulty: 0.3, unlockLevel: 3, model: "yoyo", palette: ["#3B82F6", "#FFFFFF", "#FFD54D"] }),
  prize({ id: "icecream-mint", name: "Ice Cream Eraser", description: "Mint chip, and it rubs out pencil.", category: "novelty", rarity: "common", size: 0.32, weight: 0.18, gripDifficulty: 0.35, unlockLevel: 4, model: "icecream", palette: ["#9EF0C9", "#E8B47A", "#FFD0E6"] }),
  prize({ id: "ball-star", name: "Star Ball", description: "Covered in stripes of starlight.", category: "toy", rarity: "common", size: 0.3, weight: 0.25, gripDifficulty: 0.5, unlockLevel: 5, model: "ball", palette: ["#FFD54D", "#FF4FD8", "#41C9FF"] }),
  prize({ id: "slime-orange", name: "Orange Slime", description: "Bright as a sunset, gooey as ever.", category: "slime", rarity: "common", size: 0.32, weight: 0.35, gripDifficulty: 0.45, unlockLevel: 5, model: "slime", palette: ["#FFA94D", "#FF6A57", "#FFFFFF"] }),
  prize({ id: "teddy-blue", name: "Blue Bear", description: "Calm, cosy and very huggable.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.1, unlockLevel: 6, model: "teddy", palette: ["#6FA8FF", "#CFE3FF", "#2B2D42"] }),
  prize({ id: "pen-troll-green", name: "Green Troll Pen", description: "Wild green hair, ready to write.", category: "novelty", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 6, model: "pen", palette: ["#7CF07C", "#3B82F6", "#F6C9A0"] }),

  prize({ id: "panda-plush", name: "Panda Pal", description: "Loves bamboo and big hugs.", category: "plush", rarity: "uncommon", size: 0.46, weight: 0.4, gripDifficulty: 0.15, unlockLevel: 7, model: "panda", palette: ["#FFFFFF", "#2B2D42", "#FF8FB1"] }),
  prize({ id: "octopus-plush", name: "Wiggly Octopus", description: "Eight arms, eight times the hugs.", category: "plush", rarity: "uncommon", size: 0.44, weight: 0.35, gripDifficulty: 0.3, unlockLevel: 8, model: "octopus", palette: ["#B78AFF", "#FF8AD0", "#2B2D42"] }),
  prize({ id: "cupcake-sprinkle", name: "Sprinkle Cupcake", description: "Extra sprinkles, extra sparkle.", category: "toy", rarity: "uncommon", size: 0.34, weight: 0.22, gripDifficulty: 0.3, unlockLevel: 11, model: "cupcake", palette: ["#FFFFFF", "#8C5A2B", "#FF4FD8"], finish: "sparkle" }),
  prize({ id: "bunny-squishy", name: "Bunny Squishy", description: "Squeeze it, and it bounces back.", category: "toy", rarity: "uncommon", size: 0.38, weight: 0.22, gripDifficulty: 0.35, unlockLevel: 12, model: "bunny", palette: ["#FFD0E6", "#B78AFF", "#2B2D42"] }),
  prize({ id: "icecream-rainbow", name: "Rainbow Ice Cream", description: "Two scoops of every flavour.", category: "toy", rarity: "uncommon", size: 0.36, weight: 0.25, gripDifficulty: 0.35, unlockLevel: 13, model: "icecream", palette: ["#FF8AD0", "#E8B47A", "#41C9FF"] }),
  prize({ id: "top-rainbow", name: "Rainbow Top", description: "Spins into a blur of colours.", category: "toy", rarity: "uncommon", size: 0.32, weight: 0.25, gripDifficulty: 0.45, unlockLevel: 14, model: "top", palette: ["#B78AFF", "#41C9FF", "#3DFF88"] }),
  prize({ id: "penguin-glow", name: "Glow Penguin", description: "A night-light that waddles.", category: "plush", rarity: "uncommon", size: 0.4, weight: 0.32, gripDifficulty: 0.15, unlockLevel: 16, model: "penguin", palette: ["#41C9FF", "#FFFFFF", "#FFD54D"], finish: "glow" }),
  prize({ id: "dino-blue", name: "Blue Dino", description: "A gentle giant (in tiny form).", category: "creature", rarity: "uncommon", size: 0.4, weight: 0.32, gripDifficulty: 0.2, unlockLevel: 17, model: "dino", palette: ["#3B82F6", "#BFE7FF", "#2B2D42"] }),
  prize({ id: "car-police", name: "Police Car", description: "Lights on, on patrol.", category: "vehicle", rarity: "uncommon", size: 0.36, weight: 0.45, gripDifficulty: 0.35, unlockLevel: 19, model: "car", palette: ["#FFFFFF", "#2B2D42", "#3B82F6"] }),

  prize({ id: "octopus-glow", name: "Glow Octopus", description: "Shines like a deep-sea lantern.", category: "plush", rarity: "rare", size: 0.48, weight: 0.4, gripDifficulty: 0.3, unlockLevel: 24, model: "octopus", palette: ["#3DFF88", "#B6FF3B", "#2B2D42"], finish: "glow" }),
  prize({ id: "panda-giant", name: "Giant Panda", description: "The biggest, softest panda in town.", category: "plush", rarity: "rare", size: 0.64, weight: 0.82, gripDifficulty: 0.2, unlockLevel: 26, model: "panda", palette: ["#FFFFFF", "#1B1712", "#FF8FB1"] }),
  prize({ id: "penguin-king", name: "Emperor Penguin", description: "Wears a tiny golden crown.", category: "plush", rarity: "rare", size: 0.52, weight: 0.6, gripDifficulty: 0.2, unlockLevel: 32, model: "penguin", palette: ["#1B2333", "#FFFFFF", "#FFD54D"] }),
  prize({ id: "icecream-galaxy", name: "Galaxy Ice Cream", description: "Tastes like stardust (pretend).", category: "toy", rarity: "rare", size: 0.38, weight: 0.3, gripDifficulty: 0.35, unlockLevel: 36, model: "icecream", palette: ["#7C3AED", "#E8B47A", "#41C9FF"], finish: "sparkle" }),
  prize({ id: "rocket-gold", name: "Golden Rocket", description: "Blasts off in shiny style.", category: "vehicle", rarity: "rare", size: 0.42, weight: 0.5, gripDifficulty: 0.4, unlockLevel: 38, model: "rocket", palette: ["#FFD54D", "#B8860B", "#41C9FF"], finish: "gold" }),

  prize({ id: "bunny-crystal", name: "Crystal Bunny", description: "See-through and sparkling, like ice.", category: "plush", rarity: "legendary", size: 0.46, weight: 0.6, gripDifficulty: 0.45, unlockLevel: 44, model: "bunny", palette: ["#BFE7FF", "#FFFFFF", "#41C9FF"], finish: "crystal" }),
  prize({ id: "octopus-rainbow", name: "Rainbow Octopus", description: "Every arm a different colour.", category: "plush", rarity: "legendary", size: 0.5, weight: 0.65, gripDifficulty: 0.35, unlockLevel: 46, model: "octopus", palette: ["#FF6A57", "#FFD54D", "#2B2D42"], finish: "sparkle" }),

  // --- third wave: more distinct toys to grab --------------------------------
  prize({ id: "puppy-tan", name: "Happy Puppy", description: "Waggy tail, ready for a walk.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.12, unlockLevel: 1, model: "puppy", palette: ["#D4A574", "#F3E0C8", "#2B2D42"] }),
  prize({ id: "kitty-orange", name: "Orange Kitty", description: "Purrs even when you miss.", category: "plush", rarity: "common", size: 0.38, weight: 0.28, gripDifficulty: 0.12, unlockLevel: 1, model: "kitty", palette: ["#F4A261", "#FFE0C2", "#2B2D42"] }),
  prize({ id: "frog-green", name: "Bouncy Frog", description: "Ribbit! A squishy little hopper.", category: "creature", rarity: "common", size: 0.36, weight: 0.25, gripDifficulty: 0.25, unlockLevel: 1, model: "frog", palette: ["#5EC96A", "#C8F560", "#2B2D42"] }),
  prize({ id: "chick-yellow", name: "Baby Chick", description: "Peep peep. Still a bit fluffy.", category: "plush", rarity: "common", size: 0.34, weight: 0.22, gripDifficulty: 0.15, unlockLevel: 2, model: "chick", palette: ["#FFD54D", "#FF8A3D", "#E63946"] }),
  prize({ id: "donut-pink", name: "Pink Donut", description: "Icing on top, sprinkles everywhere.", category: "toy", rarity: "common", size: 0.34, weight: 0.22, gripDifficulty: 0.35, unlockLevel: 2, model: "donut", palette: ["#FF8AD0", "#E8B47A", "#E63946"] }),
  prize({ id: "lollipop-red", name: "Cherry Lollipop", description: "A giant candy on a stick.", category: "novelty", rarity: "common", size: 0.32, weight: 0.18, gripDifficulty: 0.4, unlockLevel: 3, model: "lollipop", palette: ["#E63946", "#FFFFFF", "#FFD54D"] }),
  prize({ id: "heart-red", name: "Love Heart", description: "A squishy heart that always smiles.", category: "novelty", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 3, model: "heart", palette: ["#FF5A7A", "#FFD0E6", "#FFFFFF"] }),
  prize({ id: "bee-stripe", name: "Buzzy Bee", description: "Stripes, wings and a tiny buzz.", category: "creature", rarity: "common", size: 0.34, weight: 0.22, gripDifficulty: 0.3, unlockLevel: 4, model: "bee", palette: ["#FFD54D", "#2B2D42", "#BFE7FF"] }),
  prize({ id: "turtle-green", name: "Tiny Turtle", description: "Slow, steady and very huggable.", category: "creature", rarity: "common", size: 0.38, weight: 0.32, gripDifficulty: 0.2, unlockLevel: 4, model: "turtle", palette: ["#3FA34D", "#C8F560", "#0E9594"] }),
  prize({ id: "train-red", name: "Toy Train", description: "Choo-choo around the toy box.", category: "vehicle", rarity: "common", size: 0.38, weight: 0.42, gripDifficulty: 0.38, unlockLevel: 5, model: "train", palette: ["#E63946", "#2B2D42", "#FFD54D"] }),
  prize({ id: "owl-brown", name: "Hoot Owl", description: "Wide eyes, ready for bedtime stories.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.15, unlockLevel: 6, model: "owl", palette: ["#8C5A2B", "#F3E0C8", "#FF8A3D"] }),
  prize({ id: "fox-orange", name: "Sly Fox", description: "A bushy tail and a clever grin.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.18, unlockLevel: 6, model: "fox", palette: ["#F4A261", "#FFF1B8", "#2B2D42"] }),

  prize({ id: "puppy-spot", name: "Spotty Puppy", description: "Covered in the cutest little spots.", category: "plush", rarity: "uncommon", size: 0.42, weight: 0.32, gripDifficulty: 0.15, unlockLevel: 7, model: "puppy", palette: ["#FFFFFF", "#F3E0C8", "#2B2D42"] }),
  prize({ id: "kitty-grey", name: "Sleepy Kitty", description: "Soft grey fur, always a little sleepy.", category: "plush", rarity: "uncommon", size: 0.4, weight: 0.3, gripDifficulty: 0.12, unlockLevel: 8, model: "kitty", palette: ["#9AA4B2", "#FFE0C2", "#2B2D42"] }),
  prize({ id: "monkey-plush", name: "Cheeky Monkey", description: "A curly tail and the biggest grin.", category: "plush", rarity: "uncommon", size: 0.44, weight: 0.35, gripDifficulty: 0.2, unlockLevel: 9, model: "monkey", palette: ["#8C5A2B", "#F3E0C8", "#2B2D42"] }),
  prize({ id: "helicopter-red", name: "Toy Helicopter", description: "Spin the blades and lift off.", category: "vehicle", rarity: "uncommon", size: 0.4, weight: 0.4, gripDifficulty: 0.4, unlockLevel: 10, model: "helicopter", palette: ["#E63946", "#2B2D42", "#BFE7FF"] }),
  prize({ id: "donut-choc", name: "Chocolate Donut", description: "Chocolate icing, extra sprinkles.", category: "toy", rarity: "uncommon", size: 0.34, weight: 0.24, gripDifficulty: 0.35, unlockLevel: 11, model: "donut", palette: ["#6B3F24", "#E8B47A", "#FFD54D"] }),
  prize({ id: "gem-sapphire", name: "Sapphire Gem", description: "A chunk of pretend treasure.", category: "treasure", rarity: "uncommon", size: 0.32, weight: 0.45, gripDifficulty: 0.4, unlockLevel: 12, model: "gem", palette: ["#3B82F6", "#FFD54D", "#41C9FF"] }),
  prize({ id: "owl-snow", name: "Snow Owl", description: "Soft as a snowdrift.", category: "plush", rarity: "uncommon", size: 0.42, weight: 0.32, gripDifficulty: 0.15, unlockLevel: 13, model: "owl", palette: ["#FFFFFF", "#E8F0FF", "#FF8A3D"] }),
  prize({ id: "frog-blue", name: "Tree Frog", description: "Tiny, bright and very hoppy.", category: "creature", rarity: "uncommon", size: 0.36, weight: 0.25, gripDifficulty: 0.25, unlockLevel: 14, model: "frog", palette: ["#41C9FF", "#C8F560", "#2B2D42"] }),
  prize({ id: "ufo-saucer", name: "Mini UFO", description: "Beep. We come in peace (and prizes).", category: "vehicle", rarity: "uncommon", size: 0.4, weight: 0.4, gripDifficulty: 0.4, unlockLevel: 15, model: "ufo", palette: ["#9AD4FF", "#BFE7FF", "#3DFF88"] }),
  prize({ id: "whale-blue", name: "Baby Whale", description: "A tiny whale with a big splash.", category: "creature", rarity: "uncommon", size: 0.44, weight: 0.38, gripDifficulty: 0.22, unlockLevel: 16, model: "whale", palette: ["#5BA3D9", "#E8F4FF", "#41C9FF"] }),
  prize({ id: "train-steam", name: "Steam Train", description: "Puff, puff, prize!", category: "vehicle", rarity: "uncommon", size: 0.4, weight: 0.45, gripDifficulty: 0.38, unlockLevel: 17, model: "train", palette: ["#3B82F6", "#2B2D42", "#FFFFFF"] }),
  prize({ id: "bee-sparkle", name: "Sparkle Bee", description: "A bee that leaves a glitter trail.", category: "creature", rarity: "uncommon", size: 0.34, weight: 0.22, gripDifficulty: 0.3, unlockLevel: 18, model: "bee", palette: ["#FFD54D", "#7C3AED", "#FFFFFF"], finish: "sparkle" }),
  prize({ id: "turtle-sea", name: "Sea Turtle", description: "Ready to swim around the cabinet.", category: "creature", rarity: "uncommon", size: 0.4, weight: 0.34, gripDifficulty: 0.22, unlockLevel: 19, model: "turtle", palette: ["#0E9594", "#C8F560", "#41C9FF"] }),
  prize({ id: "fox-arctic", name: "Arctic Fox", description: "Fluffy, white and extra snuggly.", category: "plush", rarity: "uncommon", size: 0.42, weight: 0.32, gripDifficulty: 0.18, unlockLevel: 20, model: "fox", palette: ["#FFFFFF", "#E8F0FF", "#2B2D42"] }),

  prize({ id: "kitty-rainbow", name: "Rainbow Kitty", description: "A mane of every colour.", category: "plush", rarity: "rare", size: 0.44, weight: 0.35, gripDifficulty: 0.18, unlockLevel: 22, model: "kitty", palette: ["#FF8AD0", "#41C9FF", "#FFD54D"], finish: "sparkle" }),
  prize({ id: "helicopter-sky", name: "Sky Helicopter", description: "Painted like a clear blue day.", category: "vehicle", rarity: "rare", size: 0.42, weight: 0.45, gripDifficulty: 0.4, unlockLevel: 24, model: "helicopter", palette: ["#41C9FF", "#FFFFFF", "#BFE7FF"] }),
  prize({ id: "gem-ruby", name: "Ruby Gem", description: "Deep red and extra sparkly.", category: "treasure", rarity: "rare", size: 0.34, weight: 0.5, gripDifficulty: 0.42, unlockLevel: 26, model: "gem", palette: ["#E63946", "#FFD54D", "#FF8AD0"] }),
  prize({ id: "whale-glow", name: "Glow Whale", description: "Lights up the deep, deep cabinet.", category: "creature", rarity: "rare", size: 0.48, weight: 0.42, gripDifficulty: 0.25, unlockLevel: 28, model: "whale", palette: ["#41C9FF", "#E8F4FF", "#3DFF88"], finish: "glow" }),
  prize({ id: "ufo-glow", name: "Glow UFO", description: "A night-light from outer space.", category: "vehicle", rarity: "rare", size: 0.42, weight: 0.42, gripDifficulty: 0.4, unlockLevel: 32, model: "ufo", palette: ["#B78AFF", "#41C9FF", "#3DFF88"], finish: "glow" }),
  prize({ id: "heart-crystal", name: "Crystal Heart", description: "Clear, sparkly and full of love.", category: "novelty", rarity: "rare", size: 0.38, weight: 0.4, gripDifficulty: 0.4, unlockLevel: 34, model: "heart", palette: ["#FF8AD0", "#FFFFFF", "#FFD54D"], finish: "crystal" }),
  prize({ id: "monkey-king", name: "King Monkey", description: "Wears a tiny golden crown.", category: "plush", rarity: "rare", size: 0.5, weight: 0.5, gripDifficulty: 0.22, unlockLevel: 36, model: "monkey", palette: ["#8C5A2B", "#F3E0C8", "#FFD54D"] }),
  prize({ id: "owl-night", name: "Night Owl", description: "Glows when the lights go out.", category: "plush", rarity: "rare", size: 0.44, weight: 0.35, gripDifficulty: 0.18, unlockLevel: 38, model: "owl", palette: ["#2B2D42", "#B78AFF", "#FFD54D"], finish: "glow" }),

  prize({ id: "puppy-golden", name: "Golden Puppy", description: "The shiniest pup in the arcade.", category: "plush", rarity: "legendary", size: 0.5, weight: 0.6, gripDifficulty: 0.22, unlockLevel: 42, model: "puppy", palette: ["#FFD54D", "#FFF1B8", "#B8860B"], finish: "gold" }),
  prize({ id: "gem-rainbow", name: "Rainbow Gem", description: "Every colour, all at once.", category: "treasure", rarity: "legendary", size: 0.38, weight: 0.55, gripDifficulty: 0.45, unlockLevel: 44, model: "gem", palette: ["#B78AFF", "#FFD54D", "#41C9FF"], finish: "sparkle" }),
  prize({ id: "heart-gold", name: "Golden Heart", description: "A heart made of prize-machine gold.", category: "novelty", rarity: "legendary", size: 0.42, weight: 0.55, gripDifficulty: 0.3, unlockLevel: 46, model: "heart", palette: ["#FFD54D", "#FFF1B8", "#B8860B"], finish: "gold" }),
  prize({ id: "whale-star", name: "Star Whale", description: "A whale that swims through starlight.", category: "creature", rarity: "legendary", size: 0.52, weight: 0.6, gripDifficulty: 0.28, unlockLevel: 48, model: "whale", palette: ["#7C3AED", "#FFFFFF", "#FFD54D"], finish: "sparkle" }),

  // --- fourth wave: denser machines, more shapes to grab ---------------------
  prize({ id: "pig-pink", name: "Pink Piglet", description: "Oink! A round little pig with a curly tail.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.12, unlockLevel: 1, model: "pig", palette: ["#FF8FB1", "#F6C9A0", "#2B2D42"] }),
  prize({ id: "mouse-grey", name: "Squeaky Mouse", description: "Big ears, tiny feet, extra cute.", category: "plush", rarity: "common", size: 0.34, weight: 0.22, gripDifficulty: 0.15, unlockLevel: 1, model: "mouse", palette: ["#C5CDD8", "#FFC2DA", "#2B2D42"] }),
  prize({ id: "balloon-red", name: "Red Balloon", description: "Hold on tight — it wants to float away.", category: "novelty", rarity: "common", size: 0.36, weight: 0.12, gripDifficulty: 0.4, unlockLevel: 1, model: "balloon", palette: ["#E63946", "#FFD54D", "#FFFFFF"] }),
  prize({ id: "cookie-choc", name: "Cookie Pal", description: "Chocolate chips and a big smile.", category: "toy", rarity: "common", size: 0.34, weight: 0.22, gripDifficulty: 0.3, unlockLevel: 2, model: "cookie", palette: ["#E8B47A", "#6B3F24", "#2B2D42"] }),
  prize({ id: "mushroom-red", name: "Toadstool Pal", description: "A friendly red cap with white spots.", category: "creature", rarity: "common", size: 0.36, weight: 0.24, gripDifficulty: 0.22, unlockLevel: 2, model: "mushroom", palette: ["#E63946", "#FFF1B8", "#FFFFFF"] }),
  prize({ id: "flower-yellow", name: "Sunny Flower", description: "A happy flower that never wilts.", category: "novelty", rarity: "common", size: 0.36, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 3, model: "flower", palette: ["#FFD54D", "#F2B134", "#3FA34D"] }),
  prize({ id: "fish-orange", name: "Goldfish Pal", description: "Blub blub. Does not need a bowl.", category: "creature", rarity: "common", size: 0.36, weight: 0.22, gripDifficulty: 0.28, unlockLevel: 3, model: "fish", palette: ["#FF8A3D", "#FFD54D", "#2B2D42"] }),
  prize({ id: "ladybug-red", name: "Lucky Ladybug", description: "Count the spots for good luck.", category: "creature", rarity: "common", size: 0.34, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 4, model: "ladybug", palette: ["#E63946", "#2B2D42", "#2B2D42"] }),
  prize({ id: "drum-blue", name: "Toy Drum", description: "Tap tap tap! A parade in your pocket.", category: "toy", rarity: "common", size: 0.36, weight: 0.32, gripDifficulty: 0.32, unlockLevel: 4, model: "drum", palette: ["#3B82F6", "#FFF1B8", "#FFD54D"] }),
  prize({ id: "boat-white", name: "Toy Boat", description: "Ready to sail across the toy box.", category: "vehicle", rarity: "common", size: 0.38, weight: 0.35, gripDifficulty: 0.35, unlockLevel: 5, model: "boat", palette: ["#FFFFFF", "#41C9FF", "#E63946"] }),
  prize({ id: "koala-grey", name: "Sleepy Koala", description: "Always ready for a cuddle and a nap.", category: "plush", rarity: "common", size: 0.4, weight: 0.3, gripDifficulty: 0.12, unlockLevel: 6, model: "koala", palette: ["#9AA4B2", "#FFC2DA", "#2B2D42"] }),
  prize({ id: "lion-tan", name: "Little Lion", description: "A tiny roar and a fluffy mane.", category: "plush", rarity: "common", size: 0.42, weight: 0.32, gripDifficulty: 0.15, unlockLevel: 6, model: "lion", palette: ["#E8A64B", "#F3E0C8", "#2B2D42"] }),

  prize({ id: "elephant-grey", name: "Baby Elephant", description: "A trunk for hugs and ears for flying.", category: "plush", rarity: "uncommon", size: 0.46, weight: 0.4, gripDifficulty: 0.2, unlockLevel: 7, model: "elephant", palette: ["#A8B0C0", "#FFC2DA", "#2B2D42"] }),
  prize({ id: "pig-sparkle", name: "Sparkle Pig", description: "The fanciest pig in the arcade.", category: "plush", rarity: "uncommon", size: 0.4, weight: 0.3, gripDifficulty: 0.15, unlockLevel: 8, model: "pig", palette: ["#FF8AD0", "#FFD54D", "#2B2D42"], finish: "sparkle" }),
  prize({ id: "balloon-rainbow", name: "Rainbow Balloon", description: "Every colour, ready to party.", category: "novelty", rarity: "uncommon", size: 0.36, weight: 0.12, gripDifficulty: 0.4, unlockLevel: 9, model: "balloon", palette: ["#B78AFF", "#41C9FF", "#FFD54D"], finish: "sparkle" }),
  prize({ id: "flower-pink", name: "Blossom Flower", description: "Pink petals and a sunny centre.", category: "novelty", rarity: "uncommon", size: 0.36, weight: 0.2, gripDifficulty: 0.25, unlockLevel: 10, model: "flower", palette: ["#FF8AD0", "#FFD54D", "#3FA34D"] }),
  prize({ id: "fish-glow", name: "Glow Fish", description: "Lights up like a night-light under the sea.", category: "creature", rarity: "uncommon", size: 0.36, weight: 0.22, gripDifficulty: 0.28, unlockLevel: 12, model: "fish", palette: ["#41C9FF", "#3DFF88", "#2B2D42"], finish: "glow" }),
  prize({ id: "cookie-sprinkle", name: "Sprinkle Cookie", description: "Extra sprinkles, extra smiles.", category: "toy", rarity: "uncommon", size: 0.34, weight: 0.22, gripDifficulty: 0.3, unlockLevel: 13, model: "cookie", palette: ["#F3E0C8", "#FF4FD8", "#2B2D42"] }),
  prize({ id: "boat-pirate", name: "Pirate Boat", description: "A tiny ship with a tiny flag. Arr!", category: "vehicle", rarity: "uncommon", size: 0.4, weight: 0.38, gripDifficulty: 0.35, unlockLevel: 14, model: "boat", palette: ["#8C5A2B", "#FFFFFF", "#E63946"] }),
  prize({ id: "drum-rainbow", name: "Rainbow Drum", description: "Every beat a different colour.", category: "toy", rarity: "uncommon", size: 0.36, weight: 0.32, gripDifficulty: 0.32, unlockLevel: 15, model: "drum", palette: ["#FF4FD8", "#FFF1B8", "#41C9FF"] }),
  prize({ id: "crown-gold", name: "Toy Crown", description: "For the ruler of the toy box.", category: "treasure", rarity: "uncommon", size: 0.36, weight: 0.4, gripDifficulty: 0.38, unlockLevel: 16, model: "crown", palette: ["#FFD54D", "#E63946", "#B8860B"] }),
  prize({ id: "mushroom-glow", name: "Glow Toadstool", description: "A forest night-light with spots.", category: "creature", rarity: "uncommon", size: 0.36, weight: 0.24, gripDifficulty: 0.22, unlockLevel: 17, model: "mushroom", palette: ["#3DFF88", "#FFF1B8", "#FFFFFF"], finish: "glow" }),
  prize({ id: "koala-sleepy", name: "Dream Koala", description: "The sleepiest, softest koala around.", category: "plush", rarity: "uncommon", size: 0.42, weight: 0.32, gripDifficulty: 0.12, unlockLevel: 18, model: "koala", palette: ["#B8C0CC", "#FFD0E6", "#2B2D42"] }),
  prize({ id: "ladybug-gold", name: "Golden Ladybug", description: "A lucky bug in shiny gold.", category: "creature", rarity: "uncommon", size: 0.34, weight: 0.28, gripDifficulty: 0.28, unlockLevel: 19, model: "ladybug", palette: ["#FFD54D", "#2B2D42", "#B8860B"], finish: "gold" }),

  prize({ id: "lion-mane", name: "King Lion", description: "The fluffiest mane in the jungle.", category: "plush", rarity: "rare", size: 0.5, weight: 0.45, gripDifficulty: 0.18, unlockLevel: 22, model: "lion", palette: ["#F2B134", "#FFF1B8", "#2B2D42"] }),
  prize({ id: "elephant-big", name: "Giant Elephant", description: "Big ears, bigger hugs.", category: "plush", rarity: "rare", size: 0.58, weight: 0.7, gripDifficulty: 0.22, unlockLevel: 25, model: "elephant", palette: ["#9AA4B2", "#FFC2DA", "#2B2D42"] }),
  prize({ id: "balloon-galaxy", name: "Galaxy Balloon", description: "A balloon full of pretend starlight.", category: "novelty", rarity: "rare", size: 0.38, weight: 0.15, gripDifficulty: 0.42, unlockLevel: 27, model: "balloon", palette: ["#7C3AED", "#41C9FF", "#FFD54D"], finish: "sparkle" }),
  prize({ id: "crown-ruby", name: "Ruby Crown", description: "Gold and a giant pretend ruby.", category: "treasure", rarity: "rare", size: 0.38, weight: 0.48, gripDifficulty: 0.4, unlockLevel: 29, model: "crown", palette: ["#FFD54D", "#E63946", "#B8860B"], finish: "gold" }),
  prize({ id: "fish-rainbow", name: "Rainbow Fish", description: "Every scale a different colour.", category: "creature", rarity: "rare", size: 0.4, weight: 0.28, gripDifficulty: 0.3, unlockLevel: 33, model: "fish", palette: ["#FF8AD0", "#41C9FF", "#2B2D42"], finish: "sparkle" }),
  prize({ id: "koala-crystal", name: "Crystal Koala", description: "See-through, sparkly and very snuggly.", category: "plush", rarity: "rare", size: 0.44, weight: 0.45, gripDifficulty: 0.35, unlockLevel: 35, model: "koala", palette: ["#BFE7FF", "#FFFFFF", "#41C9FF"], finish: "crystal" }),
  prize({ id: "boat-gold", name: "Golden Boat", description: "The fanciest ship in the toy harbour.", category: "vehicle", rarity: "rare", size: 0.4, weight: 0.5, gripDifficulty: 0.38, unlockLevel: 37, model: "boat", palette: ["#FFD54D", "#FFFFFF", "#B8860B"], finish: "gold" }),
  prize({ id: "flower-crystal", name: "Crystal Flower", description: "A flower made of ice and light.", category: "novelty", rarity: "rare", size: 0.38, weight: 0.35, gripDifficulty: 0.35, unlockLevel: 39, model: "flower", palette: ["#B78AFF", "#FFFFFF", "#3DFF88"], finish: "crystal" }),

  prize({ id: "lion-golden", name: "Golden Lion", description: "The king of the arcade, in gold.", category: "plush", rarity: "legendary", size: 0.52, weight: 0.65, gripDifficulty: 0.22, unlockLevel: 42, model: "lion", palette: ["#FFD54D", "#FFF1B8", "#B8860B"], finish: "gold" }),
  prize({ id: "crown-rainbow", name: "Rainbow Crown", description: "Every jewel a different colour.", category: "treasure", rarity: "legendary", size: 0.4, weight: 0.55, gripDifficulty: 0.42, unlockLevel: 44, model: "crown", palette: ["#FFD54D", "#FF4FD8", "#41C9FF"], finish: "sparkle" }),
  prize({ id: "elephant-sparkle", name: "Sparkle Elephant", description: "Twinkles from trunk to tail.", category: "plush", rarity: "legendary", size: 0.54, weight: 0.7, gripDifficulty: 0.25, unlockLevel: 47, model: "elephant", palette: ["#B78AFF", "#FFD0E6", "#FFD54D"], finish: "sparkle" }),
  prize({ id: "balloon-gold", name: "Golden Balloon", description: "The balloon that never pops.", category: "novelty", rarity: "legendary", size: 0.4, weight: 0.2, gripDifficulty: 0.4, unlockLevel: 49, model: "balloon", palette: ["#FFD54D", "#FFF1B8", "#B8860B"], finish: "gold" }),
];

export const PRIZE_BY_ID: Readonly<Record<string, PrizeDef>> = Object.fromEntries(PRIZES.map((p) => [p.id, p]));

/** Engine templates, keyed by id. */
export const TOY_TEMPLATES: Readonly<Record<string, ToyTemplate>> = Object.fromEntries(
  PRIZES.map((p) => [p.id, { id: p.id, rarity: p.rarity, size: p.size, weight: p.weight, gripDifficulty: p.gripDifficulty }]),
);

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export const RARITY_ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export const CATEGORY_LABELS: Record<PrizeCategory, string> = {
  plush: "Plushies",
  slime: "Slime",
  vehicle: "Vehicles",
  toy: "Toys",
  novelty: "Novelties",
  creature: "Creatures",
  robot: "Robots",
  treasure: "Treasure",
};

/** Prizes a regular machine may offer at `level` (mystery-only prizes excluded). */
export function prizesUnlockedAt(level: number): PrizeDef[] {
  return PRIZES.filter((p) => !p.mysteryOnly && p.unlockLevel <= level);
}
