"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const browserWindow = window;
  browserWindow.addEventListener("hashchange", onChange);
  browserWindow.addEventListener("popstate", onChange);
  return () => {
    browserWindow.removeEventListener("hashchange", onChange);
    browserWindow.removeEventListener("popstate", onChange);
  };
}

function getSnapshot(): string {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function getServerSnapshot(): string {
  return "";
}

export function useLocationHash(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
