"use client";

import { useSyncExternalStore, type ReactNode } from "react";

type ClerkHydrationGateProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export function ClerkHydrationGate({
  children,
  fallback,
}: ClerkHydrationGateProps) {
  const hasHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return hasHydrated ? children : fallback;
}
