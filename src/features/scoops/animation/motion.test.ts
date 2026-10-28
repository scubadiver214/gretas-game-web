import { describe, expect, it } from "vitest";
import { FLAVORS } from "../game-data/flavors";
import { EMPTY_CREATION, type CurrentCreation } from "../types";
import { scatterPoints } from "./layout";
import { MOTION, MOTION_NOTES } from "./motionConfig";
import { meltAmount, meltStage } from "./melt";
import { loadBand, loadRatio } from "./load";
import { buildScene } from "./scene";
import { computeFrame, dripPhase, flowT, localPiecePose, noticeBetween, scoopPose, type MotionSnapshot, type PieceBody, type ScoopBody } from "./sim";

const fresh: MotionSnapshot = { stage: "fresh", band: "stable", melt: 0, load: 0 };

function cone(partial: Partial<CurrentCreation> = {}): CurrentCreation {
  return { ...EMPTY_CREATION, containerId: "cake-cone", flavorIds: ["vanilla"], ...partial };
}

const sampleScoop: ScoopBody = {
  index: 0,
  cx: 160,
  cy: 278,
  r: 74,
  flavorId: "vanilla",
  color: "#F6E7C1",
  motion: { meltRate: 1, dripSpeed: 1, dripWidth: 1 },
};

describe("melt clock", () => {
  it("follows the stage windows and never finishes the dessert", () => {
    expect(meltStage(0)).toBe("fresh");
    expect(meltStage(29.9)).toBe("fresh");
    expect(meltStage(30)).toBe("soft");
    expect(meltStage(59.9)).toBe("soft");
    expect(meltStage(60)).toBe("melting");
    expect(meltStage(119.9)).toBe("melting");
    expect(meltStage(120)).toBe("super");
    expect(meltAmount(0)).toBe(0);
    expect(meltAmount(30)).toBeCloseTo(0.16, 5);
    expect(meltAmount(60)).toBeCloseTo(0.4, 5);
    expect(meltAmount(120)).toBeCloseTo(0.7, 5);
    let previous = 0;
    for (let t = 0; t <= 400; t += 0.5) {
      const amount = meltAmount(t);
      expect(amount).toBeGreaterThanOrEqual(previous);
      expect(amount).toBeLessThan(1);
      expect(amount).toBeLessThanOrEqual(MOTION.meltCap);
      expect(amount - previous).toBeLessThan(0.02);
      previous = amount;
    }
  });

  it("starts a recreated recipe fresh", () => {
    const scene = buildScene(cone({ flavorIds: ["chocolate", "fudge"], toppingIds: ["sprinkles"], sauceIds: ["hot-fudge"] }));
    const frame = computeFrame(scene, { elapsed: 0, scoopAges: [30, 30], pieceAges: scene.pieces.map(() => 30) });
    expect(frame.stage).toBe("fresh");
    expect(frame.melt).toBe(0);
    expect(frame.puddle.opacity).toBe(0);
    expect(frame.drips).toHaveLength(0);
  });
});

describe("scoop landing", () => {
  it("drops, squashes, then settles", () => {
    const airborne = scoopPose(sampleScoop, 0, 0, 0, -1, 0);
    const impact = scoopPose(sampleScoop, 0.4, 0.4, 0, -1, 0);
    const settled = scoopPose(sampleScoop, 1, 0, 0, -1, 0);
    expect(airborne.ty).toBeLessThan(-40);
    expect(airborne.sy).toBeGreaterThan(1);
    expect(impact.sy).toBeLessThan(1);
    expect(impact.sx).toBeGreaterThan(1);
    expect(Math.abs(settled.ty)).toBeLessThan(1);
  });

  it("makes the scoops underneath bounce when a new one lands", () => {
    const quiet = scoopPose(sampleScoop, 2, 2, 0, -1, 0);
    const bounced = scoopPose(sampleScoop, 2, 2, 0, 0.1, 0);
    expect(bounced.ty).toBeGreaterThan(quiet.ty);
  });

  it("sags as the clock advances and still looks like a scoop", () => {
    const early = scoopPose(sampleScoop, 4, 10, meltAmount(10), -1, 0);
    const later = scoopPose({ ...sampleScoop, motion: { meltRate: 1, dripSpeed: 1, dripWidth: 1 } }, 4, 180, meltAmount(180), -1, 0);
    expect(later.ty).toBeGreaterThan(early.ty);
    expect(later.sy).toBeLessThan(early.sy);
    expect(later.sy).toBeGreaterThan(0.7);
  });

  it("wobbles when a heavy topping lands", () => {
    const still = scoopPose(sampleScoop, 2, 2, 0, -1, 0);
    const hit = scoopPose(sampleScoop, 2, 2, 0, -1, 1);
    expect(hit.rot).not.toBeCloseTo(still.rot, 1);
  });
});

describe("topping load", () => {
  it("keeps a few toppings stable and lets a pile overflow", () => {
    const light = buildScene(cone({ toppingIds: ["sprinkles"] }));
    const heavy = buildScene(cone({
      toppingIds: ["sprinkles", "chocolate-chips", "gummy-bears", "cookie-pieces", "oreo-pieces", "peanuts"],
      sauceIds: ["hot-fudge", "caramel", "strawberry-sauce"],
    }));
    const lightFrame = computeFrame(light, { elapsed: 5, scoopAges: [5], pieceAges: light.pieces.map(() => 5) });
    const heavyFrame = computeFrame(heavy, { elapsed: 5, scoopAges: [5], pieceAges: heavy.pieces.map(() => 5) });
    expect(lightFrame.band).toBe("stable");
    expect(heavyFrame.band).toBe("overflow");
    expect(heavyFrame.load).toBeGreaterThan(1);
  });

  it("melting lowers capacity so the same toppings slide sooner", () => {
    const scene = buildScene(cone({ toppingIds: ["chocolate-chips", "cookie-pieces", "gummy-bears"] }));
    const input = {
      pieceWeight: scene.pieces.reduce((sum, piece) => sum + piece.weight, 0),
      sauceCount: 0,
      extraWeight: 0,
      scoopCount: 1,
      topRadius: scene.scoops[0]?.r ?? 74,
      serve: "cone" as const,
      melt: 0,
    };
    const cool = loadBand(loadRatio(input));
    const warm = loadBand(loadRatio({ ...input, melt: meltAmount(120) }));
    const order = ["stable", "stir", "slide", "fall", "overflow"];
    expect(loadRatio({ ...input, melt: meltAmount(120) })).toBeGreaterThan(loadRatio(input));
    expect(order.indexOf(warm)).toBeGreaterThan(order.indexOf(cool));
  });

  it("drops toppings onto the scoop and lets overload fall to the counter", () => {
    const piece: PieceBody = { key: "chips-0", homeX: 160, homeY: 220, weight: 0.36, seed: 0.1, heavy: true };
    const landing = localPiecePose(piece, 0, 0, "stable", 0);
    expect(landing.y).toBeLessThan(piece.homeY - 40);
    let fell = false;
    for (let age = 0.5; age < 8; age += 0.05) {
      const pose = localPiecePose(piece, age, age, "overflow", 0.8);
      if (pose.y > piece.homeY + 80) fell = true;
    }
    expect(fell).toBe(true);
    for (let age = 0.5; age < 4; age += 0.2) {
      const pose = localPiecePose(piece, age, age, "stable", 0);
      expect(pose.y).toBeLessThan(piece.homeY + 8);
    }
  });
});

describe("drips and syrup", () => {
  it("shows more drips as the scoop softens", () => {
    const scene = buildScene(cone({ flavorIds: ["strawberry"], sauceIds: ["strawberry-sauce"] }));
    const young = computeFrame(scene, { elapsed: 1, scoopAges: [1], pieceAges: [] });
    const older = computeFrame(scene, { elapsed: 90, scoopAges: [90], pieceAges: [] });
    expect(young.drips.length).toBe(0);
    expect(older.drips.length).toBeGreaterThan(0);
    expect(older.puddle.opacity).toBeGreaterThan(0);
    expect(older.drips.some((drip) => drip.color === "#FF6F91")).toBe(true);
  });

  it("moves strawberry syrup faster than hot fudge", () => {
    expect(flowT(1, 1.35, 0)).toBeGreaterThan(flowT(1, 0.45, 0));
    expect(dripPhase(0.4, 1.2, 0)).toBeGreaterThan(dripPhase(0.4, 0.52, 0));
    const scene = buildScene(cone({ sauceIds: ["hot-fudge", "strawberry-sauce"] }));
    const frame = computeFrame(scene, { elapsed: 1.2, scoopAges: [2], pieceAges: [] });
    const fudge = frame.sauces.find((sauce) => sauce.id === "hot-fudge");
    const berry = frame.sauces.find((sauce) => sauce.id === "strawberry-sauce");
    expect(fudge && berry).toBeTruthy();
    expect(Math.abs(berry?.dash ?? 0)).toBeGreaterThan(Math.abs(fudge?.dash ?? 0));
    const later = computeFrame(scene, { elapsed: 2, scoopAges: [2], pieceAges: [] });
    expect(later.sauces[0]?.dropY).not.toBeCloseTo(frame.sauces[0]?.dropY ?? 0, 0);
  });
});

describe("playful notes", () => {
  it("speaks up on overload and melt without repeating the fresh start", () => {
    expect(noticeBetween(null, fresh, true)).toBeNull();
    expect(noticeBetween(fresh, { ...fresh, stage: "soft", melt: 0.16 }, false)).toBe(MOTION_NOTES.melting);
    expect(noticeBetween({ ...fresh, stage: "soft" }, { ...fresh, stage: "melting" }, false)).toBe(MOTION_NOTES.hurry);
    expect(noticeBetween({ ...fresh, stage: "melting" }, { ...fresh, stage: "super" }, false)).toBe(MOTION_NOTES.messy);
    expect(noticeBetween(fresh, { ...fresh, band: "stir", load: 0.5 }, true)).toBe(MOTION_NOTES.sprinkles);
    expect(noticeBetween({ ...fresh, band: "stir" }, { ...fresh, band: "fall", load: 0.95 }, true)).toBe(MOTION_NOTES.overload);
    expect(noticeBetween({ ...fresh, band: "fall" }, { ...fresh, band: "overflow", load: 1.2 }, false)).toBe(MOTION_NOTES.messy);
  });
});

describe("toppings stay on the scoop", () => {
  it("keeps each picture inside the dome", () => {
    const top = { cx: 160, cy: 228, r: 74 };
    const rx = top.r * 1.06 - 12;
    const ry = top.r * 0.9 - 12;
    for (const id of ["gummy-worms", "pop-rocks", "sprinkles"]) {
      for (const point of scatterPoints(id, 10, top)) {
        const nx = (point.x - top.cx) / rx;
        const ny = (point.y - top.cy) / ry;
        expect(nx * nx + ny * ny).toBeLessThanOrEqual(1);
        expect(point.y).toBeLessThan(top.cy);
      }
    }
  });
});

describe("catalog stays put", () => {
  it("keeps all 15 flavors and does not store melt on the creation", () => {
    expect(FLAVORS).toHaveLength(15);
    type Unexpected = Exclude<keyof CurrentCreation, "containerId" | "mix" | "flavorIds" | "toppingIds" | "sauceIds" | "extraIds">;
    const recipeShape: [Unexpected] extends [never] ? true : false = true;
    expect(recipeShape).toBe(true);
  });
});
