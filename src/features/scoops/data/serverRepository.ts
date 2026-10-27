import path from "node:path";
import { FileScoopsRepository } from "./fileRepository";
import type { MemoryRepository } from "./memoryRepository";

let singleton: FileScoopsRepository | null = null;

/** One shop file for this Node process. Hot reload reads it again. */
export function getScoopsRepository(): MemoryRepository {
  if (!singleton) {
    singleton = new FileScoopsRepository(path.join(process.cwd(), ".data", "scoops-db.json"));
  }
  return singleton;
}
