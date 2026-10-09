import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
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
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "list_pending_action_registration_requests_for_reviewer",
      { p_reviewer_id: userId },
    );
    if (error) throw error;
    return NextResponse.json(
      { requests: data ?? [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/registration-requests");
  }
}
