import { NextResponse } from "next/server";

import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildCommunityDigestItems,
  commitCommunityDigestRun,
  getDueCommunityDigestPeriods,
  listEnabledCommunitySubscriptions,
  listProcessedCommunityDigestRuns,
  loadPublicCommunityDigestReferences,
} from "@/lib/community/digest-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 5, window: 300 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = getSupabaseServerClient(true);
    const subscriptions = await listEnabledCommunitySubscriptions(supabase, access.userId);
    const periods = getDueCommunityDigestPeriods(subscriptions);
    if (periods.length === 0) {
      return NextResponse.json({ status: "noop", generated: [] });
    }

    const processed = await listProcessedCommunityDigestRuns(supabase, access.userId, periods);
    const pendingPeriods = periods.filter(
      (period) => !processed.has(`${period.cadence}:${period.periodKey}`),
    );
    if (pendingPeriods.length === 0) {
      return NextResponse.json({ status: "noop", generated: [] });
    }

    // This is deliberately after the cheap run check: repeated visits to a
    // processed period must not re-query actions or needs.
    const references = await loadPublicCommunityDigestReferences(
      supabase,
      subscriptions,
      pendingPeriods,
    );
    const generated = [];
    for (const period of pendingPeriods) {
      const items = buildCommunityDigestItems(references, subscriptions, period);
      generated.push(await commitCommunityDigestRun(supabase, access.userId, period, items));
    }

    return NextResponse.json({ status: "ok", generated });
  } catch (error) {
    return handleApiError(error, "POST /api/community/digest/refresh");
  }
}
