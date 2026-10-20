/** Minimal synchronous event emitter; listeners must not throw into the game loop. */
export class Emitter<E> {
  private listeners = new Set<(event: E) => void>();

  on(listener: (event: E) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: E): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error("[frogger] event listener failed", err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
