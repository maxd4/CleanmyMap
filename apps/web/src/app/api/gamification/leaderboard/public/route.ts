import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { buildPublicUserLeaderboard } from "@/lib/gamification/progression-ranking";
import { buildPublicStructureLeaderboard } from "@/lib/gamification/progression-structure-ranking";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LeaderboardMetric,
  PublicLeaderboardResponseDto,
} from "@/lib/gamification/progression-types";

export const runtime = "nodejs";

const PUBLIC_LEADERBOARD_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
};
const PUBLIC_LEADERBOARD_CACHE_REVALIDATE_SECONDS = 120;
const scopeSchema = z.enum(["user", "structure"]);
const metricSchema = z.enum(["level", "xp", "badges"]);

function buildCacheKey(scope: "user" | "structure", metric: LeaderboardMetric): string {
  return `scope:${scope}|metric:${metric}`;
}

async function loadCachedPublicLeaderboard(
  scope: "user" | "structure",
  metric: LeaderboardMetric,
): Promise<PublicLeaderboardResponseDto> {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient(true);
      const items = scope === "user"
        ? await buildPublicUserLeaderboard(supabase, metric)
        : await buildPublicStructureLeaderboard(supabase, metric);
      return {
        scope,
        metric,
        generatedAt: new Date().toISOString(),
        items,
      } satisfies PublicLeaderboardResponseDto;
    },
    ["gamification-public-leaderboard", buildCacheKey(scope, metric)],
    {
      revalidate: PUBLIC_LEADERBOARD_CACHE_REVALIDATE_SECONDS,
      tags: ["gamification-public-leaderboard"],
    },
  );

  return cached();
}

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 50, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const scope = scopeSchema.safeParse(url.searchParams.get("scope") ?? "user");
  const metric = metricSchema.safeParse(url.searchParams.get("metric") ?? "level");
  if (!scope.success || !metric.success) {
    return NextResponse.json(
      { error: "Invalid scope or metric. Use scope=user|structure and metric=level|xp|badges." },
      { status: 400 },
    );
  }

  try {
    const leaderboard = await loadCachedPublicLeaderboard(scope.data, metric.data);
    return NextResponse.json(
      { status: "ok", ...leaderboard },
      { headers: PUBLIC_LEADERBOARD_CACHE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/leaderboard/public");
  }
}
