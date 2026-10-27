import fs from "node:fs";
import path from "node:path";
import { MemoryRepository } from "./memoryRepository";
import { createSeedDatabase } from "./seed";
import { DB_VERSION, type ScoopsDatabase } from "./schema";

export function writeScoopsFile(file: string, db: ScoopsDatabase): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, file);
}

export function readScoopsFile(file: string): ScoopsDatabase {
  try {
    if (!fs.existsSync(file)) {
      const seeded = createSeedDatabase();
      writeScoopsFile(file, seeded);
      return seeded;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as ScoopsDatabase;
    if (!parsed || parsed.version !== DB_VERSION || !Array.isArray(parsed.users) || !Array.isArray(parsed.recipes)) {
      throw new Error("scoop book did not look right");
    }
    return parsed;
  } catch (err) {
    console.error("[scoops] could not read the scoop book, starting a fresh shop", err);
    const seeded = createSeedDatabase();
    writeScoopsFile(file, seeded);
    return seeded;
  }
}

export class FileScoopsRepository extends MemoryRepository {
  constructor(file: string) {
    super(readScoopsFile(file), (db) => writeScoopsFile(file, db));
  }
}
