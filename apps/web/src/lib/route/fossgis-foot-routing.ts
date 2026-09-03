import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/services/upstash";
import {
  createFallbackRouteGeometry,
  routePolylineThroughStreetNetwork,
  type RoutePolylineOptions,
} from "@/lib/geo/osrm-routing";
import type { RouteGeometry } from "@/lib/route/route-contract";

export const FOSSGIS_FOOT_BASE_URL =
  "https://routing.openstreetmap.de/routed-foot";
export const FOSSGIS_FOOT_PROFILE_SEGMENT = "driving";
export const FOSSGIS_FOOT_PROVIDER = "fossgis-osrm" as const;
export const FOSSGIS_FOOT_PROFILE = "foot" as const;
export const FOSSGIS_FOOT_TIMEOUT_MS = 5000;
export const FOSSGIS_FOOT_USER_AGENT =
  "CleanMyMap route recommender (https://cleanmymap.fr/sections/route)";
export const FOSSGIS_FOOT_REFERER = "https://cleanmymap.fr/sections/route";

const FOSSGIS_QUOTA_KEY = "global";
const FOSSGIS_QUOTA_PREFIX = "cleanmymap:external-route:fossgis-foot";
const FOSSGIS_QUOTA_TIMEOUT_MS = 1000;

type FossgisRateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    reason?: string;
  }>;
};

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

let cachedRedisClient: RedisClient | null = null;
let cachedRateLimiter: FossgisRateLimiter | null = null;

function getFossgisRateLimiter(redis: RedisClient): FossgisRateLimiter {
  if (cachedRedisClient !== redis || cachedRateLimiter === null) {
    cachedRedisClient = redis;
    cachedRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(1, "1 s"),
      prefix: FOSSGIS_QUOTA_PREFIX,
      ephemeralCache: false,
      timeout: FOSSGIS_QUOTA_TIMEOUT_MS,
    });
  }

  return cachedRateLimiter;
}

async function acquireFossgisQuota(): Promise<boolean> {
  let redis: ReturnType<typeof getRedisClient>;
  try {
    redis = getRedisClient();
  } catch (error) {
    console.warn("FOSSGIS quota unavailable; using route fallback", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  if (!redis) {
    return false;
  }

  try {
    const result = await getFossgisRateLimiter(redis).limit(FOSSGIS_QUOTA_KEY);
    return result.success === true && result.reason !== "timeout";
  } catch (error) {
    console.warn("FOSSGIS quota unavailable; using route fallback", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function isValidRouteInput(coordinates: [number, number][]): boolean {
  return (
    coordinates.length >= 2 &&
    coordinates.length <= 100 &&
    coordinates.every(
      ([latitude, longitude]) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180,
    )
  );
}

export type FossgisFootRoutingOptions = Pick<
  RoutePolylineOptions,
  "transport" | "timeoutMs"
>;

/**
 * Server-only pedestrian routing for route recommendations.
 *
 * FOSSGIS is called only after the distributed external quota grants the
 * global slot. Any quota or provider failure returns the deterministic local
 * geometry and never retries the external request.
 */
export async function routePolylineThroughFossgisFoot(
  coordinates: [number, number][],
  options: FossgisFootRoutingOptions = {},
): Promise<RouteGeometry> {
  if (!isValidRouteInput(coordinates)) {
    return createFallbackRouteGeometry(coordinates);
  }

  if (!(await acquireFossgisQuota())) {
    return createFallbackRouteGeometry(coordinates);
  }

  return routePolylineThroughStreetNetwork(coordinates, {
    transport: options.transport,
    timeoutMs: Math.min(
      Math.max(options.timeoutMs ?? FOSSGIS_FOOT_TIMEOUT_MS, 1),
      FOSSGIS_FOOT_TIMEOUT_MS,
    ),
    baseUrl: FOSSGIS_FOOT_BASE_URL,
    profileSegment: FOSSGIS_FOOT_PROFILE_SEGMENT,
    provider: FOSSGIS_FOOT_PROVIDER,
    profile: FOSSGIS_FOOT_PROFILE,
    steps: true,
    headers: {
      "User-Agent": FOSSGIS_FOOT_USER_AGENT,
      Referer: FOSSGIS_FOOT_REFERER,
    },
  });
}
