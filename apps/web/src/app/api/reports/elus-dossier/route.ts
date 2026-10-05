import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { buildElusDossierPayload } from "./route-aggregation";
import { buildCachedPdfResponse } from "./route-cache";
import { buildDossierResponse } from "./route-response";
import { parseElusDossierRequest } from "./route-scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const params = parseElusDossierRequest(new URL(request.url));
  const supabase = getSupabaseAdminClient();

  try {
    if (params.format === "pdf") {
      return await buildCachedPdfResponse(supabase, params.cachedPdfPath);
    }

    const payload = await buildElusDossierPayload({
      supabase,
      days: params.days,
      limit: params.limit,
      floorDate: params.floorDate,
      scope: params.scope,
    });
    return buildDossierResponse(payload, params.format);
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}
