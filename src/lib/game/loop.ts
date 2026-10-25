/**
 * Drives `onFrame(dt, now)` from requestAnimationFrame until the returned stop()
 * is called. `dt` is in seconds and clamped, so a tab switch or a breakpoint never
 * makes the game lurch forward.
 */
export function runLoop(onFrame: (dt: number, now: number) => void): () => void {
  let last = performance.now();
  let id = 0;
  let running = true;
  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    onFrame(dt, now);
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => {
    running = false;
    cancelAnimationFrame(id);
  };
}
