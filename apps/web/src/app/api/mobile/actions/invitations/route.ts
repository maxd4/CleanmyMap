import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import { parseActionInvitationRows, parseActionSupabaseResult } from "@/lib/actions/query";

export const runtime = "nodejs";
// Justification Vercel: invitation state is authenticated, private and changes after each decision.
export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  registrationId: z.string().uuid(),
  decision: z.enum(["accept", "reject"]),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export async function GET(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "list_pending_action_invitations_for_recipient",
      { p_recipient_id: access.userId },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const invitations = parseActionInvitationRows(result.data);
    if (!invitations) {
      return NextResponse.json({ error: "Réponse d’invitations invalide." }, { status: 502 });
    }
    // Justification Vercel: private invitations must not be served from a shared cache.
    return NextResponse.json({ invitations }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/mobile/actions/invitations");
  }
}

export async function PATCH(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  try {
    const rawResult: unknown = await getSupabaseServerClient(true).rpc("respond_to_action_invitation", {
      p_registration_id: parsed.data.registrationId,
      p_recipient_id: access.userId,
      p_decision: parsed.data.decision,
    });
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const candidate = isUnknownArray(result.data) ? result.data[0] : null;
    const row = isRecord(candidate) ? candidate : null;
    const status = row && typeof row.status === "string" ? row.status : null;
    if (!row || !status || !["accepted", "rejected", "unavailable"].includes(status)) {
      return NextResponse.json({ error: "État d'invitation invalide." }, { status: 502 });
    }
    return NextResponse.json({ status, registrationId: typeof row.registration_id === "string" ? row.registration_id : parsed.data.registrationId, actionId: typeof row.action_id === "string" ? row.action_id : null });
  } catch (error) {
    return handleApiError(error, "PATCH /api/mobile/actions/invitations");
  }
}
