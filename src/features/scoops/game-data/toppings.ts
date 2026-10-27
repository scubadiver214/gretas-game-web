import type { Topping } from "../types";

export const TOPPINGS: readonly Topping[] = [
  { id: "sprinkles", name: "Sprinkles", emoji: "🎊", description: "A rain of classic sprinkles.", rarity: "common", color: "#FF6FA5", scatter: "dots", unlockLevel: 1, unlockedByDefault: true },
  { id: "rainbow-sprinkles", name: "Rainbow Sprinkles", emoji: "🌈", description: "Every color, all at once.", rarity: "uncommon", color: "#7AD7FF", scatter: "dots", unlockLevel: 1, unlockedByDefault: true },
  { id: "chocolate-chips", name: "Chocolate Chips", emoji: "🍫", description: "Little chips that sink in.", rarity: "common", color: "#5C3317", scatter: "chunks", unlockLevel: 1, unlockedByDefault: true },
  { id: "gummy-bears", name: "Gummy Bears", emoji: "🧸", description: "Chewy bears on parade.", rarity: "uncommon", color: "#F59E0B", scatter: "puffs", unlockLevel: 1, unlockedByDefault: true },
  { id: "cookie-pieces", name: "Cookie Pieces", emoji: "🍪", description: "Crunchy cookie bits.", rarity: "common", color: "#C4A574", scatter: "chunks", unlockLevel: 1, unlockedByDefault: true },
  { id: "oreo-pieces", name: "Oreo Pieces", emoji: "🖤", description: "Dark cookie crumbs.", rarity: "uncommon", color: "#2B2B2B", scatter: "chunks", unlockLevel: 1, unlockedByDefault: true },
  { id: "brownie-pieces", name: "Brownie Pieces", emoji: "🟫", description: "Fudgy brownie squares.", rarity: "uncommon", color: "#6B3A2A", scatter: "chunks", unlockLevel: 2, unlockedByDefault: false },
  { id: "marshmallows", name: "Marshmallows", emoji: "☁️", description: "Soft white puffs.", rarity: "common", color: "#FFF8F2", scatter: "puffs", unlockLevel: 1, unlockedByDefault: true },
  { id: "candies", name: "Candy Bits", emoji: "🔴", description: "Colorful candy-coated bits.", rarity: "common", color: "#EF4444", scatter: "dots", unlockLevel: 1, unlockedByDefault: true },
  { id: "peanuts", name: "Peanuts", emoji: "🥜", description: "Crunchy and salty.", rarity: "common", color: "#E2B56A", scatter: "chunks", unlockLevel: 1, unlockedByDefault: true },
  { id: "cherries", name: "Cherries", emoji: "🍒", description: "A handful of cherries.", rarity: "common", color: "#E11D48", scatter: "puffs", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "strawberries", name: "Strawberries", emoji: "🍓", description: "Fresh strawberry slices.", rarity: "common", color: "#FB7185", scatter: "slices", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "blueberries", name: "Blueberries", emoji: "🫐", description: "Tiny blue bursts.", rarity: "common", color: "#6366F1", scatter: "dots", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "banana", name: "Banana Slices", emoji: "🍌", description: "Soft yellow coins.", rarity: "common", color: "#FDE047", scatter: "slices", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "gummy-worms", name: "Gummy Worms", emoji: "🐛", description: "Wiggly worms. Friendly ones.", rarity: "uncommon", color: "#84CC16", scatter: "worms", unlockLevel: 3, unlockedByDefault: false },
  { id: "cotton-candy-puff", name: "Cotton Candy", emoji: "☁️", description: "A cloud of cotton candy.", rarity: "rare", color: "#F0ABFC", scatter: "puffs", unlockLevel: 5, unlockedByDefault: false },
  { id: "pop-rocks", name: "Pop Rocks", emoji: "✨", description: "They snap and crackle.", rarity: "rare", color: "#38BDF8", scatter: "dots", unlockLevel: 4, unlockedByDefault: false },
  { id: "mini-cookies", name: "Mini Cookies", emoji: "🍪", description: "Bite-size cookies.", rarity: "uncommon", color: "#D4A574", scatter: "chunks", unlockLevel: 1, unlockedByDefault: true },
  { id: "candy-stars", name: "Candy Stars", emoji: "⭐", description: "Stars you can crunch.", rarity: "rare", color: "#FACC15", scatter: "stars", unlockLevel: 6, unlockedByDefault: false },
];
