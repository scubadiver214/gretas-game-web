import { MAX_EXTRAS, MAX_SAUCES, MAX_TOPPINGS, MIX_MAX, SCOOP_LADDER } from "../config";
import type { CurrentCreation, MixStyle } from "../types";

export interface CreationChange {
  creation: CurrentCreation;
  message: string | null;
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function creationsEqual(a: CurrentCreation, b: CurrentCreation): boolean {
  return a.containerId === b.containerId && a.mix === b.mix && sameIds(a.flavorIds, b.flavorIds) && sameIds(a.toppingIds, b.toppingIds) && sameIds(a.sauceIds, b.sauceIds) && sameIds(a.extraIds, b.extraIds);
}

function without(ids: readonly string[], id: string): string[] {
  return ids.filter((item) => item !== id);
}

export function setContainer(creation: CurrentCreation, containerId: string): CreationChange {
  if (creation.containerId === containerId) {
    return { creation: { ...creation, containerId: undefined }, message: null };
  }
  return { creation: { ...creation, containerId }, message: null };
}

export function setMix(creation: CurrentCreation, mix: MixStyle): CreationChange {
  const max = MIX_MAX[mix];
  if (creation.flavorIds.length <= max) {
    return { creation: { ...creation, mix }, message: null };
  }
  return {
    creation: { ...creation, mix, flavorIds: creation.flavorIds.slice(0, max) },
    message: "That style holds fewer scoops, so I kept the first ones.",
  };
}

export function addFlavor(creation: CurrentCreation, flavorId: string): CreationChange {
  if (creation.flavorIds.includes(flavorId)) {
    return { creation: { ...creation, flavorIds: without(creation.flavorIds, flavorId) }, message: null };
  }
  const max = MIX_MAX[creation.mix];
  if (creation.flavorIds.length >= max) {
    const step = SCOOP_LADDER.indexOf(creation.mix);
    const next = step >= 0 ? SCOOP_LADDER[step + 1] : undefined;
    if (next && creation.flavorIds.length < MIX_MAX[next]) {
      return {
        creation: { ...creation, mix: next, flavorIds: [...creation.flavorIds, flavorId] },
        message: next === "crazy" ? "Crazy Mix! This cone is getting wild." : `That's a ${next === "double" ? "double" : "triple"} scoop now!`,
      };
    }
    return { creation, message: "This scoop is full! Take one off, or pick Crazy Mix." };
  }
  return { creation: { ...creation, flavorIds: [...creation.flavorIds, flavorId] }, message: null };
}

export function addTopping(creation: CurrentCreation, toppingId: string): CreationChange {
  if (creation.toppingIds.includes(toppingId)) {
    return { creation: { ...creation, toppingIds: without(creation.toppingIds, toppingId) }, message: null };
  }
  if (creation.toppingIds.length >= MAX_TOPPINGS) {
    return { creation, message: "That's plenty of toppings!" };
  }
  return { creation: { ...creation, toppingIds: [...creation.toppingIds, toppingId] }, message: null };
}

export function addSauce(creation: CurrentCreation, sauceId: string): CreationChange {
  if (creation.sauceIds.includes(sauceId)) {
    return { creation: { ...creation, sauceIds: without(creation.sauceIds, sauceId) }, message: null };
  }
  if (creation.sauceIds.length >= MAX_SAUCES) {
    return { creation, message: "Three sauces is the most this scoop can hold." };
  }
  return { creation: { ...creation, sauceIds: [...creation.sauceIds, sauceId] }, message: null };
}

export function addExtra(creation: CurrentCreation, extraId: string): CreationChange {
  if (creation.extraIds.includes(extraId)) {
    return { creation: { ...creation, extraIds: without(creation.extraIds, extraId) }, message: null };
  }
  if (creation.extraIds.length >= MAX_EXTRAS) {
    return { creation, message: "The top of this scoop is full!" };
  }
  return { creation: { ...creation, extraIds: [...creation.extraIds, extraId] }, message: null };
}

export type IngredientSlot = "container" | "flavor" | "topping" | "sauce" | "extra";

export function removeIngredient(creation: CurrentCreation, slot: IngredientSlot, id: string): CreationChange {
  switch (slot) {
    case "container":
      return { creation: { ...creation, containerId: creation.containerId === id ? undefined : creation.containerId }, message: null };
    case "flavor":
      return { creation: { ...creation, flavorIds: without(creation.flavorIds, id) }, message: null };
    case "topping":
      return { creation: { ...creation, toppingIds: without(creation.toppingIds, id) }, message: null };
    case "sauce":
      return { creation: { ...creation, sauceIds: without(creation.sauceIds, id) }, message: null };
    case "extra":
      return { creation: { ...creation, extraIds: without(creation.extraIds, id) }, message: null };
    default:
      return { creation, message: null };
  }
}

export interface CreationHistory {
  past: CurrentCreation[];
  present: CurrentCreation;
  future: CurrentCreation[];
}

const HISTORY_LIMIT = 40;

export function pushHistory(history: CreationHistory, next: CurrentCreation): CreationHistory {
  if (creationsEqual(history.present, next)) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
}

export function undoHistory(history: CreationHistory): CreationHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future].slice(0, HISTORY_LIMIT),
  };
}

export function redoHistory(history: CreationHistory): CreationHistory {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
  };
}
