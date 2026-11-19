import { NextResponse } from "next/server";

import { loadPersonalEngagementProofProjection } from "@/lib/actions/engagement-proof-projection";
import { ACCOUNT_PRIVATE_RESPONSE_HEADERS } from "@/lib/auth/account-mutation";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: les preuves d'engagement bénévole sont strictement owner-scoped et réévaluées à chaque lecture.
// Politique de confidentialité : réponse private, no-store pour empêcher tout stockage en cache partagé.
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: ACCOUNT_PRIVATE_RESPONSE_HEADERS,
  });
}

export async function GET(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const requestedUserId = new URL(request.url).searchParams.get("userId")?.trim();
  if (requestedUserId && requestedUserId !== access.userId) {
    return noStoreJson(
      {
        status: "error",
        error: "La projection des preuves d’engagement est strictement limitée au titulaire du compte.",
      },
      403,
    );
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 30, window: 60 },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const projection = await loadPersonalEngagementProofProjection(supabase, access.userId);
    const httpStatus = projection.status === "error" ? 503 : 200;
    return noStoreJson(projection, httpStatus);
  } catch (error) {
    return handleApiError(error, "GET /api/account/engagement-proofs");
  }
}
