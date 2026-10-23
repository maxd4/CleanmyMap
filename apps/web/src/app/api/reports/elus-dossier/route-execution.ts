import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { buildElusDossierPayload } from "./route-aggregation";
import { buildCachedPdfResponse } from "./route-cache";
import { buildDossierResponse } from "./route-response";
import type { parseElusDossierRequest } from "./route-scope";

export async function executeDossierExport(
  params: ReturnType<typeof parseElusDossierRequest>,
) {
  try {
    const supabase = getSupabaseAdminClient();
    if (params.format === "pdf") return await buildCachedPdfResponse(supabase, params.cachedPdfPath);
    const payload = await buildElusDossierPayload({ supabase, days: params.days, limit: params.limit, floorDate: params.floorDate, scope: params.scope });
    return buildDossierResponse(payload, params.format);
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}
