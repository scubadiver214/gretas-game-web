/**
 * Uniform grid over the XZ plane for "what is near this point" queries
 * (obstacles, pickups, track samples). Built once per track; queries reuse the
 * caller's array so the hot loop never allocates.
 */
export class SpatialGrid<T extends { x: number; z: number }> {
  private readonly cells = new Map<number, T[]>();

  constructor(readonly cellSize: number) {}

  private key(cx: number, cz: number): number {
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  insert(item: T): void {
    const k = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.z / this.cellSize));
    const cell = this.cells.get(k);
    if (cell) cell.push(item);
    else this.cells.set(k, [item]);
  }

  /** Replaces the contents of `out` with every item in a cell that overlaps the square around (x, z). Returns the count. */
  queryInto(out: T[], x: number, z: number, radius: number): number {
    out.length = 0;
    const c = this.cellSize;
    const x0 = Math.floor((x - radius) / c);
    const x1 = Math.floor((x + radius) / c);
    const z0 = Math.floor((z - radius) / c);
    const z1 = Math.floor((z + radius) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.cells.get(this.key(cx, cz));
        if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i]);
      }
    }
    return out.length;
  }
}
