"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useIsFetching, type Query } from "@tanstack/react-query";
import BootSplash from "./BootSplash";

declare module "@tanstack/react-query" {
  interface Register {
    /** `background` reads paint their own pending state and must not cover the app. */
    queryMeta: { background?: boolean };
  }
}

/**
 * How long a navigation may sit on the splash before we give the previous
 * screen back. A hung route should not trap the player on a spinner.
 */
const PENDING_LIMIT_MS = 45_000;

type PendingRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
};

const PendingRouterContext = createContext<PendingRouter | null>(null);

function here(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** True when `href` is the page already on screen, so a push would not leave. */
function isCurrent(href: string): boolean {
  const next = new URL(href, window.location.href);
  return `${next.pathname}${next.search}` === here();
}

/**
 * Drops the splash once the address bar matches the route we asked for,
 * including a query-only change such as `/play/claw?level=2`.
 */
function RouteArrival({ onArrive }: { onArrive: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const location = `${pathname}?${search.toString()}`;
  const seen = useRef(location);

  useLayoutEffect(() => {
    if (seen.current === location) return;
    seen.current = location;
    onArrive();
  }, [location, onArrive]);

  return null;
}

/**
 * A query may set `meta.background` when the screen already shows its own
 * pending UI, or can be used before the response arrives. Every other fetch
 * with no data yet takes the full-screen splash.
 */
function blocksTheScreen(query: Query): boolean {
  return query.state.fetchStatus === "fetching" && query.state.data === undefined && query.meta?.background !== true;
}

function PendingSplash({ navigating }: { navigating: boolean }) {
  const blocking = useIsFetching({ predicate: blocksTheScreen });
  if (!navigating && blocking === 0) return null;
  return <BootSplash />;
}

/**
 * Full-screen feedback while a navigation or a blocking API read is in flight.
 * `router.push` otherwise leaves the current screen in place until the next
 * response arrives, so a tap on a game looks like it did nothing.
 */
export function PendingNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [generation, setGeneration] = useState(0);
  const clear = useCallback(() => setPending(false), []);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), PENDING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [pending, generation]);

  const begin = useCallback(() => {
    setPending(true);
    setGeneration((n) => n + 1);
  }, []);

  const go = useCallback(
    (href: string, kind: "push" | "replace") => {
      if (isCurrent(href)) return;
      begin();
      if (kind === "push") router.push(href);
      else router.replace(href);
    },
    [begin, router],
  );

  const api = useMemo<PendingRouter>(
    () => ({
      push: (href) => go(href, "push"),
      replace: (href) => go(href, "replace"),
      back: () => {
        begin();
        router.back();
      },
    }),
    [begin, go, router],
  );

  return (
    <PendingRouterContext.Provider value={api}>
      <Suspense fallback={null}>
        <RouteArrival onArrive={clear} />
      </Suspense>
      {children}
      <PendingSplash navigating={pending} />
    </PendingRouterContext.Provider>
  );
}

/** `push` / `replace` that raise the loading screen until the next route paints. */
export function usePendingRouter(): PendingRouter {
  const router = useContext(PendingRouterContext);
  if (!router) throw new Error("usePendingRouter must be used inside PendingNavigation");
  return router;
}
