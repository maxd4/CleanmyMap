import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  registrationId: z.string().uuid(),
  decision: z.enum(["accept", "reject"]),
});

export async function GET(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const result = await getSupabaseServerClient(true).rpc(
      "list_pending_action_invitations_for_recipient",
      { p_recipient_id: access.userId },
    );
    if (result.error) throw result.error;
    return NextResponse.json({ invitations: result.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
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
    const result = await getSupabaseServerClient(true).rpc("respond_to_action_invitation", {
      p_registration_id: parsed.data.registrationId,
      p_recipient_id: access.userId,
      p_decision: parsed.data.decision,
    });
    if (result.error) throw result.error;
    const row = (result.data ?? [])[0] as { status?: string; registration_id?: string; action_id?: string } | undefined;
    if (!row || !["accepted", "rejected", "unavailable"].includes(row.status ?? "")) {
      return NextResponse.json({ error: "État d'invitation invalide." }, { status: 502 });
    }
    return NextResponse.json({ status: row.status, registrationId: row.registration_id ?? parsed.data.registrationId, actionId: row.action_id ?? null });
  } catch (error) {
    return handleApiError(error, "PATCH /api/mobile/actions/invitations");
  }
}
