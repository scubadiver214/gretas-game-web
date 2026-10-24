import type { Group } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef, ToyModelId } from "../../content/prizes";
import {
  buildBalloon,
  buildBoat,
  buildCookie,
  buildCrown,
  buildDrum,
  buildElephant,
  buildFish,
  buildFlower,
  buildKoala,
  buildLadybug,
  buildLion,
  buildMouse,
  buildMushroom,
  buildPig,
} from "./arcade";
import { buildBunny, buildCupcake, buildIceCream, buildOctopus, buildPanda, buildPenguin, buildTop } from "./critters";
import {
  buildBee,
  buildChick,
  buildDonut,
  buildFox,
  buildFrog,
  buildGem,
  buildHeart,
  buildHelicopter,
  buildKitty,
  buildLollipop,
  buildMonkey,
  buildOwl,
  buildPuppy,
  buildTrain,
  buildTurtle,
  buildUfo,
  buildWhale,
} from "./friends";
import { buildDino, buildDragon, buildSquishy, buildTeddy, buildUnicorn } from "./plush";
import { buildBall, buildBrush, buildDuck, buildEraser, buildFidget, buildPen, buildRing, buildSlime, buildStar, buildYoyo } from "./small";
import { buildCar, buildChest, buildGeneric, buildPlane, buildRobot, buildRocket } from "./vehicles";

export type ToyBuilder = (kit: MeshKit, prize: PrizeDef) => Group;

/** Model builders by id. Every builder returns a group that fits a unit sphere, facing +z. */
export const TOY_BUILDERS: Record<ToyModelId, ToyBuilder> = {
  teddy: buildTeddy,
  duck: buildDuck,
  ball: buildBall,
  car: buildCar,
  slime: buildSlime,
  dino: buildDino,
  yoyo: buildYoyo,
  brush: buildBrush,
  pen: buildPen,
  plane: buildPlane,
  ring: buildRing,
  eraser: buildEraser,
  star: buildStar,
  unicorn: buildUnicorn,
  fidget: buildFidget,
  squishy: buildSquishy,
  robot: buildRobot,
  rocket: buildRocket,
  dragon: buildDragon,
  chest: buildChest,
  bunny: buildBunny,
  penguin: buildPenguin,
  panda: buildPanda,
  octopus: buildOctopus,
  cupcake: buildCupcake,
  icecream: buildIceCream,
  top: buildTop,
  puppy: buildPuppy,
  kitty: buildKitty,
  frog: buildFrog,
  monkey: buildMonkey,
  owl: buildOwl,
  fox: buildFox,
  chick: buildChick,
  turtle: buildTurtle,
  bee: buildBee,
  whale: buildWhale,
  helicopter: buildHelicopter,
  train: buildTrain,
  donut: buildDonut,
  lollipop: buildLollipop,
  gem: buildGem,
  heart: buildHeart,
  ufo: buildUfo,
  pig: buildPig,
  elephant: buildElephant,
  mouse: buildMouse,
  lion: buildLion,
  fish: buildFish,
  ladybug: buildLadybug,
  cookie: buildCookie,
  balloon: buildBalloon,
  mushroom: buildMushroom,
  flower: buildFlower,
  boat: buildBoat,
  crown: buildCrown,
  drum: buildDrum,
  koala: buildKoala,
  generic: buildGeneric,
};

/**
 * Builds a prize's model at its catalog size (bounding-sphere radius). The
 * group's origin is the sphere centre, so it can be placed straight at a
 * ToyState's position.
 */
export function buildToy(kit: MeshKit, prize: PrizeDef): Group {
  const builder = TOY_BUILDERS[prize.model] ?? buildGeneric;
  const g = builder(kit, prize);
  g.scale.setScalar(prize.size);
  return g;
}

/**
 * Raise (or lower) a mesh so its visual bottom sits on the bottom of a
 * physics sphere of `radius`. Flat toys (cars, donuts) otherwise hover
 * because their mesh does not fill the whole sphere.
 */
export function floorSitOffset(visualBottom: number, radius: number): number {
  return -radius - visualBottom;
}
