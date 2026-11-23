import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getUserOptionalConsentEligibility } from "@/lib/minor-consent-server";
import { isOptionalConsentTreatmentAllowed } from "@/lib/minor-consent";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: consent is account/action-specific and eligibility can change per request.
export const dynamic = "force-dynamic";

const actionIdSchema = z.string().uuid();
const consentSchema = z.object({ enabled: z.boolean() }).strict();

// Vercel contract: account-specific consent and eligibility must never be cached or shared.
function privateJson(body: unknown, status = 200): Response {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function privateResponse(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(_request: Request, context: { params: Promise<{ actionId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return privateResponse(unauthorizedJsonResponse());
  const parsedActionId = actionIdSchema.safeParse((await context.params).actionId.trim());
  if (!parsedActionId.success) return privateJson({ error: "Action introuvable." }, 404);
  try {
    const supabase = getSupabaseServerClient(true);
    const eligibility = await getUserOptionalConsentEligibility(access.userId);
    if (!isOptionalConsentTreatmentAllowed(eligibility)) {
      const revocation = await supabase.rpc("set_action_participant_visibility_consent", {
        p_action_id: parsedActionId.data,
        p_user_id: access.userId,
        p_enabled: false,
        p_age_eligible: false,
      });
      if (revocation.error) throw revocation.error;
      return privateJson({ enabled: false });
    }
    const result = await supabase
      .from("action_participant_visibility_consents")
      .select("consented_at, revoked_at, age_eligible")
      .eq("action_id", parsedActionId.data)
      .eq("user_id", access.userId)
      .maybeSingle();
    if (result.error) throw result.error;
    const consent = result.data as { consented_at?: string | null; revoked_at?: string | null; age_eligible?: boolean } | null;
    return privateJson({ enabled: Boolean(consent?.consented_at && !consent.revoked_at && consent.age_eligible) });
  } catch (error) {
    return privateResponse(handleApiError(error, "GET /api/actions/[actionId]/participant-visibility"));
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ actionId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return privateResponse(unauthorizedJsonResponse());
  const parsedActionId = actionIdSchema.safeParse((await context.params).actionId.trim());
  if (!parsedActionId.success) return privateJson({ error: "Action introuvable." }, 404);
  const parsedBody = consentSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return privateResponse(validationErrorResponse(parsedBody.error.flatten().fieldErrors));

  const eligibility = await getUserOptionalConsentEligibility(access.userId);
  const eligible = isOptionalConsentTreatmentAllowed(eligibility);
  if (parsedBody.data.enabled && !eligible) {
    return privateJson({ error: "Cette visibilité facultative n’est pas disponible pour ce compte." }, 403);
  }
  try {
    const result = await getSupabaseServerClient(true).rpc("set_action_participant_visibility_consent", {
      p_action_id: parsedActionId.data,
      p_user_id: access.userId,
      p_enabled: parsedBody.data.enabled,
      p_age_eligible: parsedBody.data.enabled && eligible,
    });
    if (result.error) {
      if (result.error.code === "P0002") return privateJson({ error: "Action ou participation indisponible." }, 404);
      if (result.error.code === "42501") return privateJson({ error: "Cette visibilité facultative n’est pas disponible pour ce compte." }, 403);
      throw result.error;
    }
    return privateJson({ status: "updated", enabled: parsedBody.data.enabled });
  } catch (error) {
    return privateResponse(handleApiError(error, "PATCH /api/actions/[actionId]/participant-visibility"));
  }
}
