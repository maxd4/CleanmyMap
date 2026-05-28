"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import {
  ADMIN_ROUTE,
  EXPLORER_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

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
  const lastTrackedRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastTrackedRouteKeyRef.current === routeKey) {
      return;
    }
    lastTrackedRouteKeyRef.current = routeKey;
    void trackFunnel("page_view", "complete", buildRouteMeta(pathname, searchParams));
  }, [pathname, routeKey]);

  return null;
}
