import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { adminErrorResponse, newOperationId } from "@/lib/admin/response";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildDeliverableHeaders } from "@/lib/reports/http";
import {
  buildReferralLineageCsv,
  buildReferralLineageExportResult,
  type ReferralLineageProfileRow,
} from "@/lib/admin/referral-lineage-export";

export const runtime = "nodejs";

async function loadReferralProfiles(): Promise<ReferralLineageProfileRow[]> {
  const supabase = getSupabaseServerClient();
  const profiles: ReferralLineageProfileRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, referral_code, referred_by_profile_id, referred_at, created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as ReferralLineageProfileRow[];
    profiles.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return profiles;
}

export async function GET() {
  const operationId = newOperationId();
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  try {
    const profiles = await loadReferralProfiles();
    const exportResult = buildReferralLineageExportResult(profiles);
    const csv = buildReferralLineageCsv(exportResult.rows);
    const { headers: responseHeaders } = buildDeliverableHeaders({
      rubrique: "admin_referral_lineage",
      extension: "csv",
      contentType: "text/csv; charset=utf-8",
    });

    return new Response(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        ...responseHeaders,
        "X-Referral-Total-Profiles": String(exportResult.summary.totalProfiles),
        "X-Referral-Direct-Links": String(exportResult.summary.directLinks),
        "X-Referral-Max-Depth": String(exportResult.summary.maxDepth),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Admin Referrals Export] Listing failed", {
      operationId,
      message,
    });

    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message: "L'export des filiations a échoué.",
      hint: "Réessaie dans quelques secondes ou vérifie le schéma Supabase des profils.",
      operationId,
    });
  }
}
