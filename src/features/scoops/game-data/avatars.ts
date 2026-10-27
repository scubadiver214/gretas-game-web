import type { AvatarDef } from "../types";

/** Free faces. Everything else is won by saving a scoop. unlockLevel 99 keeps level-ups from handing them out. */
const prize = (unlockLevel: number): Pick<AvatarDef, "unlockLevel" | "unlockedByDefault"> => ({
  unlockLevel,
  unlockedByDefault: false,
});

export const AVATARS: readonly AvatarDef[] = [
  { id: "classic", name: "Classic Scoop", emoji: "🍨", blurb: "Pink, cheerful, ready.", color: "#FF8FB8", unlockLevel: 1, unlockedByDefault: true },
  { id: "berry", name: "Berry Scoop", emoji: "🍓", blurb: "Strawberry cheeks.", color: "#FF6F91", unlockLevel: 1, unlockedByDefault: true },
  { id: "sprinkle-pal", name: "Sprinkle Pal", emoji: "🎊", blurb: "You saved your very first scoop!", color: "#FF6FA5", prize: "Save your first ice cream.", ...prize(99) },
  { id: "cone-kid", name: "Cone Kid", emoji: "🍦", blurb: "A crunchy cone hero.", color: "#F0C27A", prize: "Save a scoop in a cone.", ...prize(99) },
  { id: "cup-kid", name: "Cup Kid", emoji: "🥤", blurb: "Cup crew, reporting for sprinkles.", color: "#7AD7FF", prize: "Save a scoop in a cup.", ...prize(99) },
  { id: "cherry-champ", name: "Cherry Champ", emoji: "🍒", blurb: "The cherry always lands on top.", color: "#E11D48", prize: "Save a scoop with a cherry on top.", ...prize(99) },
  { id: "double-buddy", name: "Double Buddy", emoji: "👯", blurb: "Two flavors, one happy cone.", color: "#C084FC", prize: "Save two flavors together.", ...prize(99) },
  { id: "tower-champ", name: "Tower Champ", emoji: "🗼", blurb: "That stack is scoop-tacular.", color: "#FFB15A", prize: "Save three flavors stacked up.", ...prize(99) },
  { id: "rainbow-rider", name: "Rainbow Rider", emoji: "🌈", blurb: "Sprinkles in every color.", color: "#7AD7FF", prize: "Save a scoop with rainbow sprinkles.", ...prize(99) },
  { id: "cocoa-captain", name: "Cocoa Captain", emoji: "🍫", blurb: "Chocolate from cone to cherry.", color: "#6B3A2A", prize: "Save chocolate, fudge, and chocolate chips.", ...prize(99) },
  { id: "fruit-friend", name: "Fruit Friend", emoji: "🍇", blurb: "A whole fruit parade.", color: "#FB7185", prize: "Save three fruit ingredients.", ...prize(99) },
  { id: "swirl-star", name: "Swirl Star", emoji: "🌀", blurb: "Two flavors, twisted.", color: "#F7A6FF", prize: "Save a swirl.", ...prize(99) },
  { id: "silly-scoop", name: "Silly Scoop", emoji: "🤪", blurb: "Four flavors. No rules.", color: "#FDE047", prize: "Save a Crazy Mix.", ...prize(99) },
  { id: "fancy-finish", name: "Fancy Finish", emoji: "✨", blurb: "Topping, sauce, and a decoration.", color: "#FACC15", prize: "Save a topping, a sauce, and a decoration.", ...prize(99) },
  { id: "waffle-wizard", name: "Waffle Wizard", emoji: "🧇", blurb: "A tall waffle-cone spell.", color: "#E8A317", prize: "Save a waffle cone with three flavors and a sauce.", ...prize(99) },
  { id: "gummy-guru", name: "Gummy Guru", emoji: "🧸", blurb: "Bears and a wiggly worm.", color: "#84CC16", prize: "Save gummy bears and a gummy worm.", ...prize(99) },
  { id: "party-pal", name: "Party Pal", emoji: "🎉", blurb: "Make a wish, then save it.", color: "#FFD6EA", prize: "Save birthday cake with a birthday candle.", ...prize(99) },
  { id: "moon-ranger", name: "Moon Ranger", emoji: "🌙", blurb: "Blue Moon and Superman, saved.", color: "#65BFFF", prize: "Save a Super Moon: Blue Moon and Superman.", ...prize(99) },
  { id: "unicorn-friend", name: "Unicorn Friend", emoji: "🦄", blurb: "Cotton candy and a rainbow.", color: "#E9A8FF", prize: "Save cotton candy, rainbow sprinkles, and a rainbow.", ...prize(99) },
  { id: "shop-star", name: "Shop Star", emoji: "⭐", blurb: "Five scoops in the book.", color: "#FFD54D", prize: "Save 5 different ice creams.", ...prize(99) },
  { id: "recipe-hero", name: "Recipe Hero", emoji: "🦸", blurb: "Ten creations. A real scooper.", color: "#3B82F6", prize: "Save 10 different ice creams.", ...prize(99) },
  { id: "shelbys-twin", name: "Shelby's Twin", emoji: "💗", blurb: "You made Shelby's secret scoop.", color: "#FF8FB8", prize: "Save Shelby's secret favorite.", ...prize(99) },
];
