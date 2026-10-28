import { catalog } from "../game-data/catalog";
import type { CurrentCreation, Flavor } from "../types";
import { highestSpot, pieceCount, scatterPoints, seatYFor, spots } from "./layout";
import { MOTION, PIECE_WEIGHT, flavorMotion, sauceMotion } from "./motionConfig";
import type { SceneInput } from "./sim";

/** Picture layout for the current ingredients. Melt and poses are not part of this. */
export function buildScene(creation: CurrentCreation): SceneInput {
  const container = creation.containerId ? catalog.containerById.get(creation.containerId) : undefined;
  const serve = container?.serve ?? "none";
  const flavors = creation.flavorIds.map((id) => catalog.flavorById.get(id)).filter((flavor): flavor is Flavor => Boolean(flavor));
  const layout = spots(creation.mix, flavors.length, seatYFor(serve));
  const scoops = layout.map((spot) => {
    const flavor = flavors[Math.min(spot.index, flavors.length - 1)];
    return {
      index: spot.index,
      cx: spot.cx,
      cy: spot.cy,
      r: spot.r,
      flavorId: flavor?.id ?? "vanilla",
      color: flavor?.color ?? "#F6E7C1",
      motion: flavorMotion(flavor?.id ?? "vanilla"),
    };
  });
  const top = highestSpot(layout);
  const pieces = top
    ? creation.toppingIds.flatMap((id) => {
        const topping = catalog.toppingById.get(id);
        if (!topping) return [];
        const weight = PIECE_WEIGHT[topping.scatter];
        return scatterPoints(id, pieceCount(topping.scatter), top).map((home, index) => ({
          key: `${id}-${index}`,
          homeX: home.x,
          homeY: home.y,
          weight,
          seed: home.seed,
          heavy: weight >= MOTION.heavyWeight,
        }));
      }).slice(0, MOTION.maxPieces)
    : [];
  const sauces = creation.sauceIds.flatMap((id, index) => {
    const sauce = catalog.sauceById.get(id);
    if (!sauce) return [];
    const motion = sauceMotion(id);
    const color = sauce.color === "#FFF8F2" ? "#f3d7c2" : sauce.color;
    return [{ id, color, speed: motion.speed, width: motion.width, index }];
  });
  return {
    scoops,
    pieces,
    sauces,
    extraWeight: creation.extraIds.length * MOTION.extraWeight,
    serve,
    hasSprinkles: creation.toppingIds.some((id) => id === "sprinkles" || id === "rainbow-sprinkles"),
  };
}
