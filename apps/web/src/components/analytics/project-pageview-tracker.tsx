"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { normalizeAnalyticsRoute } from "@/lib/analytics/sanitize-analytics-payload";

const PAGEVIEW_TRACKING_STORAGE_KEY = "cleanmymap.funnel.pageviews";
const PAGEVIEW_DEDUPE_WINDOW_MS = 5000;
const PAGEVIEW_GLOBAL_COOLDOWN_STORAGE_KEY =
  "cleanmymap.funnel.pageviews.last_any";
const PAGEVIEW_GLOBAL_COOLDOWN_MS = 30_000;

type TrackedPageviewMap = Record<string, number>;

export function buildRouteMeta(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
): Record<string, unknown> {
  const route = normalizeAnalyticsRoute(pathname);
  const queryEntries = Array.from(searchParams?.entries() ?? []);

  return {
    source: "route_tracker",
    kind: "pageview",
    pagePath: route.path,
    routeKind: route.routeKind,
    routeSection: route.routeSection,
    routeDepth: route.routeDepth,
    routeSegmentCount: route.routeSegmentCount,
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

function readLastTrackedPageviewAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PAGEVIEW_GLOBAL_COOLDOWN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeLastTrackedPageviewAt(at: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PAGEVIEW_GLOBAL_COOLDOWN_STORAGE_KEY,
      String(at),
    );
  } catch {
    // Ignore storage failures and keep the tracker best-effort.
  }
}

export function shouldTrackPageview(routeKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const now = Date.now();
  const lastTrackedAt = readLastTrackedPageviewAt();
  if (
    typeof lastTrackedAt === "number" &&
    now - lastTrackedAt < PAGEVIEW_GLOBAL_COOLDOWN_MS
  ) {
    return false;
  }

  const trackedPageviews = readTrackedPageviews();
  const lastTrackedRouteAt = trackedPageviews[routeKey];

  if (
    typeof lastTrackedRouteAt === "number" &&
    now - lastTrackedRouteAt < PAGEVIEW_DEDUPE_WINDOW_MS
  ) {
    return false;
  }

  trackedPageviews[routeKey] = now;
  writeLastTrackedPageviewAt(now);

  for (const [trackedRouteKey, trackedAt] of Object.entries(trackedPageviews)) {
    if (now - trackedAt > PAGEVIEW_GLOBAL_COOLDOWN_MS * 4) {
      delete trackedPageviews[trackedRouteKey];
    }
  }

  writeTrackedPageviews(trackedPageviews);
  return true;
}

export function ProjectPageviewTracker() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // On ne compte qu'un pageview par pathname; les changements de query restent
  // des interactions intra-page et ne doivent pas générer une nouvelle invocation.
  useEffect(() => {
    if (!hasAnalyticsConsent()) {
      return;
    }
    if (!shouldTrackPageview(pathname)) {
      return;
    }
    void trackFunnel(
      "page_view",
      "complete",
      buildRouteMeta(pathname, searchParamsRef.current),
    );
  }, [pathname]);

  return null;
}
