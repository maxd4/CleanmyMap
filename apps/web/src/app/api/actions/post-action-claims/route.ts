import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: this reviewer projection is private, dynamic and must
// recheck current claim status and organizer/admin permissions on every read.
export const dynamic = "force-dynamic";
// Cache/no-store justification: claim cards contain private recipient and
// reviewer state and must never be served from a shared cache.

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const userId = (await auth()).userId;
  if (!userId) return unauthorizedJsonResponse();

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "list_pending_post_action_claims_for_reviewer",
      { p_reviewer_id: userId },
    );
    if (error) throw error;
    return NextResponse.json(
      { claims: data ?? [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/post-action-claims");
  }
}
