import { NextResponse } from "next/server";
import { buildMapActionsRouteResult } from "@/lib/actions/map-route";
import { buildActionInsights } from "@/lib/actions/insights";
import { toActionMapItem } from "@/lib/actions/data-contract";
import { fetchUnifiedActionContracts, parseEntityTypesParam } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";
// Justification Vercel: la carte dépend des filtres, de la zone et d'un état frais, donc le cache statique ne suffit pas.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = await buildMapActionsRouteResult(new URL(request.url), {
      getSupabaseServerClient,
      fetchUnifiedActionContracts,
      parseEntityTypesParam,
      buildActionInsights,
      toActionMapItem,
      filterActionContractsByScope,
    });

    return NextResponse.json(result.body, result.headers ? { headers: result.headers } : undefined);
  } catch (error) {
    return handleApiError(error, "GET /api/actions/map");
  }
}
