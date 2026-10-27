import type { Sauce } from "../types";

export const SAUCES: readonly Sauce[] = [
  { id: "hot-fudge", name: "Hot Fudge", emoji: "🍫", description: "Warm, dark, and glossy.", rarity: "common", color: "#4A2C22", unlockLevel: 1, unlockedByDefault: true },
  { id: "caramel", name: "Caramel", emoji: "🍮", description: "A golden drizzle.", rarity: "common", color: "#E08A3C", unlockLevel: 1, unlockedByDefault: true },
  { id: "strawberry-sauce", name: "Strawberry Sauce", emoji: "🍓", description: "Pink and juicy.", rarity: "common", color: "#FB7185", unlockLevel: 1, unlockedByDefault: true, tags: ["fruit"] },
  { id: "chocolate-syrup", name: "Chocolate Syrup", emoji: "🤎", description: "A shiny chocolate ribbon.", rarity: "common", color: "#7A4A32", unlockLevel: 1, unlockedByDefault: true },
  { id: "marshmallow", name: "Marshmallow", emoji: "☁️", description: "Sticky and sweet.", rarity: "common", color: "#FFF8F2", unlockLevel: 1, unlockedByDefault: true },
  { id: "peanut-butter", name: "Peanut Butter", emoji: "🥜", description: "Creamy and nutty.", rarity: "uncommon", color: "#C48A3A", unlockLevel: 3, unlockedByDefault: false },
  { id: "blue-raspberry", name: "Blue Raspberry", emoji: "💙", description: "Electric blue and tangy.", rarity: "rare", color: "#38BDF8", unlockLevel: 4, unlockedByDefault: false },
  { id: "rainbow-sauce", name: "Rainbow Sauce", emoji: "🌈", description: "A stripe of every color.", rarity: "rare", color: "#C084FC", unlockLevel: 6, unlockedByDefault: false },
];
