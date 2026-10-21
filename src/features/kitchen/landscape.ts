"use client";

/**
 * Landscape for the kitchen on phones and tablets. Browsers only allow an
 * orientation lock from a user gesture, and Chrome on Android only while the
 * page is fullscreen (or an installed PWA). iOS has no lock at all, so the
 * game also shows a "turn your device" screen in portrait (RotateOverlay).
 */

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

function orientation(): LockableOrientation | null {
  if (typeof screen === "undefined" || !screen.orientation) return null;
  return screen.orientation as LockableOrientation;
}

/** True when this browser can rotate the page for us (Android Chrome and friends). */
export function canLockLandscape(): boolean {
  if (typeof document === "undefined") return false;
  return typeof orientation()?.lock === "function" && typeof document.documentElement.requestFullscreen === "function";
}

/** Fullscreen + landscape lock. Call from a tap; quietly does nothing where unsupported. */
export async function enterLandscape(): Promise<boolean> {
  const o = orientation();
  if (!o?.lock) return false;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
    await o.lock("landscape");
    return true;
  } catch {
    return false;
  }
}

/** Back to the app's normal orientation (the manifest pins it to portrait). */
export function exitLandscape(): void {
  try {
    orientation()?.unlock?.();
  } catch {
    // not locked
  }
  if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
}
