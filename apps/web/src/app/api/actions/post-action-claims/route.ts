import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isPendingPostActionClaimRow } from "@/lib/actions/runtime-contracts";
import { parseActionRows, parseActionSupabaseResult } from "@/lib/actions/query";

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
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "list_pending_post_action_claims_for_reviewer",
      { p_reviewer_id: userId },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const claims = result.data === null ? [] : parseActionRows(result.data, isPendingPostActionClaimRow);
    if (!claims) throw new Error("La réponse des demandes de rattachement est invalide.");
    return NextResponse.json(
      { claims },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/post-action-claims");
  }
}
