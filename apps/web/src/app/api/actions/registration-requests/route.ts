import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isPendingRegistrationRequestRow } from "@/lib/actions/runtime-contracts";
import { parseActionRows, parseActionSupabaseResult } from "@/lib/actions/query";

export const runtime = "nodejs";
// Cache/no-store justification: cette projection privée doit rester dynamique et fraîche par reviewer.
export const dynamic = "force-dynamic";

/**
 * Projection of action_event notifications onto the canonical pending
 * group_form registrations. This is not a second request queue: the inbox
 * event and the registration row must both still exist and be actionable.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "list_pending_action_registration_requests_for_reviewer",
      { p_reviewer_id: userId },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const requests = result.data === null ? [] : parseActionRows(result.data, isPendingRegistrationRequestRow);
    if (!requests) throw new Error("La réponse des demandes d'inscription est invalide.");
    return NextResponse.json(
      { requests },
      // Cache/no-store justification: cette projection privée doit rester fraîche par reviewer.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/registration-requests");
  }
}
