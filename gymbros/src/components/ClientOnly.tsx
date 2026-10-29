"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Renders children only in the browser: pages depend on the user's local day and session. */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? children : <p className="pt-10 text-center text-sm text-muted">Warming up... 🏋️</p>;
}
