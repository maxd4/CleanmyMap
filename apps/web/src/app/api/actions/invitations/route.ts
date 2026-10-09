import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: les invitations privées restent fraîches par destinataire (no-store).
export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  registrationId: z.string().uuid(),
  decision: z.enum(["accept", "reject"]),
});

async function getCurrentUserId() {
  const { userId } = await auth();
  return userId;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "list_pending_action_invitations_for_recipient",
      { p_recipient_id: userId },
    );
    if (error) throw error;
    return NextResponse.json(
      { invitations: data ?? [] },
      // Cache/no-store justification: cette projection privée doit rester fraîche par destinataire.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/invitations");
  }
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedJsonResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "respond_to_action_invitation",
      {
        p_registration_id: parsed.data.registrationId,
        p_recipient_id: userId,
        p_decision: parsed.data.decision,
      },
    );
    if (error) throw error;
    const result = (data ?? [])[0] as {
      status?: string;
      registration_id?: string;
      action_id?: string;
    } | undefined;
    const status = result?.status;
    if (status !== "accepted" && status !== "rejected" && status !== "unavailable") {
      return NextResponse.json({ error: "État d'invitation invalide." }, { status: 502 });
    }
    return NextResponse.json(
      {
        status,
        registrationId: result?.registration_id ?? parsed.data.registrationId,
        actionId: result?.action_id ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/invitations");
  }
}
