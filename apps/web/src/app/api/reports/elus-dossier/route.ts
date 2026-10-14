import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { buildElusDossierPayload } from "./route-aggregation";
import { buildCachedPdfResponse } from "./route-cache";
import { buildDossierResponse } from "./route-response";
import { parseElusDossierRequest } from "./route-scope";

export const runtime = "nodejs";

async function executeDossierExport(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  params: ReturnType<typeof parseElusDossierRequest>,
) {
  try {
    if (params.format === "pdf") return await buildCachedPdfResponse(supabase, params.cachedPdfPath);
    const payload = await buildElusDossierPayload({ supabase, days: params.days, limit: params.limit, floorDate: params.floorDate, scope: params.scope });
    return buildDossierResponse(payload, params.format);
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 5, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const params = parseElusDossierRequest(new URL(request.url));
  const supabase = getSupabaseAdminClient();

  return executeDossierExport(supabase, params);
}
