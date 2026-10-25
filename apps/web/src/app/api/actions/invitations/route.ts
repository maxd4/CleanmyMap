import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  createServerRateLimitResponse,
  verifyRateLimit,
} from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isActionInvitationDecisionRow,
  isPendingRegistrationRequestRow,
} from "@/lib/actions/runtime-contracts";
import {
  parseActionRows,
  parseActionSingleRow,
  parseActionSupabaseResult,
} from "@/lib/actions/query";

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

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "list_pending_action_invitations_for_recipient",
      { p_recipient_id: userId },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const invitations = result.data === null
      ? []
      : parseActionRows(result.data, isPendingRegistrationRequestRow);
    if (!invitations) throw new Error("La réponse des invitations est invalide.");
    return NextResponse.json(
      { invitations },
      // Cache/no-store justification: cette projection privée doit rester fraîche par destinataire.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/invitations");
  }
}

export async function PATCH(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 10, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

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
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "respond_to_action_invitation",
      {
        p_registration_id: parsed.data.registrationId,
        p_recipient_id: userId,
        p_decision: parsed.data.decision,
      },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const decision = parseActionSingleRow(result.data, isActionInvitationDecisionRow);
    if (!decision) {
      return NextResponse.json({ error: "État d'invitation invalide." }, { status: 502 });
    }
    return NextResponse.json(
      {
        status: decision.status,
        registrationId: decision.registration_id,
        actionId: decision.action_id,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/invitations");
  }
}
