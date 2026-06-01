"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  ADMIN_ROUTE,
  EXPLORER_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

const PAGEVIEW_TRACKING_STORAGE_KEY = "cleanmymap.funnel.pageviews";
const PAGEVIEW_DEDUPE_WINDOW_MS = 5000;

type TrackedPageviewMap = Record<string, number>;

function deriveRouteKind(pathname: string): string {
  if (pathname === "/") {
    return "home";
  }
  if (pathname.startsWith(ADMIN_ROUTE)) {
    return "admin";
  }
  if (pathname.startsWith("/community")) {
    return "community";
  }
  if (pathname.startsWith(PROFIL_ROUTE)) {
    return "profile";
  }
  if (pathname.startsWith("/methodologie")) {
    return "methodology";
  }
  if (pathname.startsWith(EXPLORER_ROUTE)) {
    return "explorer";
  }
  return pathname.split("/").filter(Boolean)[0] ?? "home";
}

function buildRouteMeta(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
): Record<string, unknown> {
  const segments = pathname.split("/").filter(Boolean);
  const queryEntries = Array.from(searchParams?.entries() ?? []);

  return {
    source: "route_tracker",
    kind: "pageview",
    pagePath: pathname,
    routeKind: deriveRouteKind(pathname),
    routeSection: segments[1] ?? segments[0] ?? "home",
    routeDepth: segments.length,
    routeSegmentCount: segments.length,
    queryParamCount: queryEntries.length,
    hasQuery: queryEntries.length > 0,
  };
}

function readTrackedPageviews(): TrackedPageviewMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(PAGEVIEW_TRACKING_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<TrackedPageviewMap>(
      (acc, [key, value]) => {
        if (typeof key === "string" && typeof value === "number") {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

function writeTrackedPageviews(trackedPageviews: TrackedPageviewMap): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PAGEVIEW_TRACKING_STORAGE_KEY,
      JSON.stringify(trackedPageviews),
    );
  } catch {
    // Ignore storage failures and keep the tracker best-effort.
  }
}

function shouldTrackPageview(routeKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const now = Date.now();
  const trackedPageviews = readTrackedPageviews();
  const lastTrackedAt = trackedPageviews[routeKey];

  if (typeof lastTrackedAt === "number" && now - lastTrackedAt < PAGEVIEW_DEDUPE_WINDOW_MS) {
    return false;
  }

  trackedPageviews[routeKey] = now;

  for (const [trackedRouteKey, trackedAt] of Object.entries(trackedPageviews)) {
    if (now - trackedAt > PAGEVIEW_DEDUPE_WINDOW_MS * 4) {
      delete trackedPageviews[trackedRouteKey];
    }
  }

  writeTrackedPageviews(trackedPageviews);
  return true;
}

export function ProjectPageviewTracker() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const entries = Array.from(searchParams?.entries() ?? []).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyCompare = leftKey.localeCompare(rightKey);
      return keyCompare !== 0 ? keyCompare : leftValue.localeCompare(rightValue);
    });
    const queryString = entries.map(([key, value]) => `${key}=${value}`).join("&");
    return `${pathname}${queryString ? `?${queryString}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!shouldTrackPageview(routeKey)) {
      return;
    }
    void trackFunnel("page_view", "complete", buildRouteMeta(pathname, searchParams));
  }, [pathname, routeKey, searchParams]);

  return null;
}
