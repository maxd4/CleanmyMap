import { NextResponse } from "next/server";
import { z } from "zod";

import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getUserOptionalConsentEligibility } from "@/lib/minor-consent-server";
import { isOptionalConsentTreatmentAllowed } from "@/lib/minor-consent";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const updateSchema = z.object({ enabled: z.boolean() }).strict();

function privateResponse(data: Record<string, unknown>) {
  // private/no-store is required because consent and age state are owner data.
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eligibility = await getUserOptionalConsentEligibility(access.userId);
    const result = await getSupabaseServerClient(true)
      .from("territorial_legend_consents")
      .select("enabled, age_band, activated_at, revoked_at, updated_at")
      .eq("user_id", access.userId)
      .maybeSingle();
    if (result.error) throw result.error;
    const row = result.data as { enabled?: boolean; age_band?: string; activated_at?: string | null; revoked_at?: string | null; updated_at?: string | null } | null;
    return privateResponse({
      enabled: row?.enabled === true,
      ageBand: row?.age_band ?? "unknown",
      optionalTreatmentAllowed: isOptionalConsentTreatmentAllowed({
        ageBand: eligibility.ageBand,
        parentalConsentVerified: eligibility.parentalConsentVerified,
      }),
      activatedAt: row?.activated_at ?? null,
      revokedAt: row?.revoked_at ?? null,
      updatedAt: row?.updated_at ?? null,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/users/profile/territorial-legend-consent");
  }
}

export async function PATCH(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = await parseJsonBodyWithValidation(request, updateSchema);
  if (!parsed.ok) return parsed.response;

  const eligibility = await getUserOptionalConsentEligibility(access.userId);
  if (parsed.data.enabled && !isOptionalConsentTreatmentAllowed(eligibility)) {
    return NextResponse.json(
      { error: "Une tranche d’âge autorisée et, si nécessaire, un accord parental sont requis.", ageBand: eligibility.ageBand },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const now = new Date().toISOString();
    const result = await getSupabaseServerClient(true).rpc("set_territorial_legend_consent", {
      p_user_id: access.userId,
      p_enabled: parsed.data.enabled,
      p_age_band: eligibility.ageBand,
      p_now: now,
    });
    if (result.error) throw result.error;
    const row = result.data as { enabled?: boolean; age_band?: string; activated_at?: string | null; revoked_at?: string | null; updated_at?: string | null } | null;
    return privateResponse({
      status: "updated",
      enabled: row?.enabled === true,
      ageBand: row?.age_band ?? eligibility.ageBand,
      activatedAt: row?.activated_at ?? null,
      revokedAt: row?.revoked_at ?? null,
      updatedAt: row?.updated_at ?? now,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/profile/territorial-legend-consent");
  }
}
