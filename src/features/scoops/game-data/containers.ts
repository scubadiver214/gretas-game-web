import type { Container } from "../types";

export const CONTAINERS: readonly Container[] = [
  { id: "cake-cone", name: "Cake Cone", emoji: "🍦", description: "A light, crispy cake cone.", rarity: "common", serve: "cone", color: "#F0C27A", accent: "#E2A84A", pattern: "plain", unlockLevel: 1, unlockedByDefault: true },
  { id: "sugar-cone", name: "Sugar Cone", emoji: "🔺", description: "Sweet, pale, and crunchy.", rarity: "common", serve: "cone", color: "#F6D7A2", accent: "#E8BE78", pattern: "plain", unlockLevel: 1, unlockedByDefault: true },
  { id: "waffle-cone", name: "Waffle Cone", emoji: "🧇", description: "A golden grid you can hear crunch.", rarity: "common", serve: "cone", color: "#E8A317", accent: "#C47E08", pattern: "waffle", unlockLevel: 1, unlockedByDefault: true },
  { id: "chocolate-waffle", name: "Chocolate Waffle", emoji: "🍫", description: "A waffle cone dipped in chocolate.", rarity: "uncommon", serve: "cone", color: "#6B3E2A", accent: "#3E2418", pattern: "waffle", unlockLevel: 3, unlockedByDefault: false },
  { id: "sprinkle-cone", name: "Sprinkle Cone", emoji: "🎊", description: "A cone that already dressed up.", rarity: "uncommon", serve: "cone", color: "#F0C27A", accent: "#FF6FA5", pattern: "sprinkles", unlockLevel: 4, unlockedByDefault: false },
  { id: "rainbow-cone", name: "Rainbow Cone", emoji: "🌈", description: "Every stripe of the rainbow.", rarity: "rare", serve: "cone", color: "#FF8FAB", accent: "#7AD7FF", pattern: "rainbow", unlockLevel: 6, unlockedByDefault: false },
  { id: "small-cup", name: "Small Cup", emoji: "🥤", description: "A little cup for a little scoop.", rarity: "common", serve: "cup", color: "#FFFFFF", accent: "#FF8FAB", pattern: "stripes", unlockLevel: 1, unlockedByDefault: true },
  { id: "large-cup", name: "Large Cup", emoji: "🥛", description: "Room for a tall stack.", rarity: "common", serve: "cup", color: "#FFF6EA", accent: "#7AD7FF", pattern: "stripes", unlockLevel: 1, unlockedByDefault: true },
  { id: "rainbow-cup", name: "Rainbow Cup", emoji: "🌈", description: "A cup painted like a rainbow.", rarity: "rare", serve: "cup", color: "#FFFFFF", accent: "#C084FC", pattern: "rainbow", unlockLevel: 5, unlockedByDefault: false },
  { id: "shelby-cup", name: "Shelby's Cup", emoji: "💗", description: "The shop cup, with Shelby's smile.", rarity: "uncommon", serve: "cup", color: "#FFE3F0", accent: "#FF6FA5", pattern: "logo", unlockLevel: 1, unlockedByDefault: true },
  { id: "birthday-cup", name: "Birthday Cup", emoji: "🎉", description: "Stars and a party rim.", rarity: "rare", serve: "cup", color: "#FFF4D6", accent: "#FFB15A", pattern: "stars", unlockLevel: 7, unlockedByDefault: false },
  { id: "mystery-cup", name: "Mystery Cup", emoji: "❓", description: "A surprise pattern from the back room.", rarity: "legendary", serve: "cup", color: "#E9D5FF", accent: "#7C3AED", pattern: "mystery", unlockLevel: 8, unlockedByDefault: false },
];
