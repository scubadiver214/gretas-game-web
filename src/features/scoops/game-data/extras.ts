import type { Extra } from "../types";

export const EXTRAS: readonly Extra[] = [
  { id: "whipped-cream", name: "Whipped Cream", emoji: "🍦", description: "A tall white swirl.", rarity: "common", unlockLevel: 1, unlockedByDefault: true },
  { id: "cherry", name: "Cherry", emoji: "🍒", description: "The cherry on top.", rarity: "common", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "wafer", name: "Graham Wafer", emoji: "🧇", description: "A crisp graham wafer.", rarity: "common", unlockLevel: 1, unlockedByDefault: true },
  { id: "cookie", name: "Cookie", emoji: "🍪", description: "A whole cookie, standing proud.", rarity: "common", unlockLevel: 1, unlockedByDefault: true },
  { id: "candy-cane", name: "Candy Cane", emoji: "🍬", description: "Peppermint stripes.", rarity: "uncommon", unlockLevel: 2, unlockedByDefault: false },
  { id: "candle", name: "Birthday Candle", emoji: "🕯️", description: "Make a wish.", rarity: "rare", unlockLevel: 7, unlockedByDefault: false },
  { id: "mini-donut", name: "Mini Donut", emoji: "🍩", description: "A tiny frosted donut.", rarity: "uncommon", unlockLevel: 4, unlockedByDefault: false },
  { id: "brownie", name: "Brownie", emoji: "🟫", description: "A square of brownie.", rarity: "uncommon", unlockLevel: 3, unlockedByDefault: false },
  { id: "pretzel", name: "Pretzel", emoji: "🥨", description: "Salty twist.", rarity: "uncommon", unlockLevel: 2, unlockedByDefault: false },
  { id: "gummy-worm", name: "Gummy Worm", emoji: "🐛", description: "One extra-wiggly worm.", rarity: "uncommon", unlockLevel: 3, unlockedByDefault: false },
  { id: "rainbow", name: "Rainbow", emoji: "🌈", description: "A little rainbow arch.", rarity: "rare", unlockLevel: 5, unlockedByDefault: false },
  { id: "candy-star", name: "Candy Star", emoji: "⭐", description: "A star that sticks the landing.", rarity: "rare", unlockLevel: 6, unlockedByDefault: false },
];
