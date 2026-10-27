import os from "node:os";
import path from "node:path";
import { FileScoopsRepository } from "./fileRepository";
import { MemoryRepository } from "./memoryRepository";

let singleton: MemoryRepository | null = null;

/** Writable shop file. The app directory is read-only in the production container. */
export function scoopsDbFile(): string {
  const dir = process.env.SCOOPS_DATA_DIR?.trim() || path.join(os.tmpdir(), "gretas-scoops");
  return path.join(dir, "scoops-db.json");
}

/**
 * Opens the file shop, or a seeded in-memory shop if that file cannot be created.
 * A read-only disk must not take down the community list.
 */
export function createScoopsRepository(file = scoopsDbFile()): MemoryRepository {
  try {
    return new FileScoopsRepository(file);
  } catch (err) {
    console.error("[scoops] shop file unavailable, keeping the shop in memory", err);
    return new MemoryRepository();
  }
}

/** One shop for this Node process. */
export function getScoopsRepository(): MemoryRepository {
  if (!singleton) singleton = createScoopsRepository();
  return singleton;
}
