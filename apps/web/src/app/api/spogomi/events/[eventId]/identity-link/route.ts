import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  claimSpogomiIdentityLink,
  requestCleanMyMapParticipation,
  SpogomiIdentityLinkError,
} from "@/lib/spogomi/identity-link";

export const runtime = "nodejs";
// Justification Vercel: identity-link state is sensitive and changes after each verified claim.
export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: z.string().trim().min(16).max(100) });
type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 8, window: 60 });
  if (rateLimited) return rateLimited;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationErrorResponse({ code: ["Code de liaison invalide."] });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const { eventId } = await context.params;
    const supabase = getSupabaseServerClient(true);
    const link = await claimSpogomiIdentityLink(supabase, {
      eventId,
      code: parsed.data.code,
      clerkId: access.userId,
    });
    const action = await supabase
      .from("actions")
      .select("action_phase")
      .eq("id", link.actionId)
      .maybeSingle();
    if (action.error) throw action.error;

    const participation = action.data?.action_phase
      ? await requestCleanMyMapParticipation(supabase, {
          actionId: link.actionId,
          clerkId: access.userId,
          actionPhase: action.data.action_phase as "pre_action" | "post_action_draft" | "post_action_complete",
        })
      : { status: "unavailable" as const, store: null };

    return NextResponse.json({
      status: "ok",
      linkStatus: link.linkStatus,
      attendanceStatus: link.attendanceStatus,
      participation,
      note: "La liaison du compte ne confirme pas la présence. Seule la confirmation organisateur d’une participation CleanMyMap déclenche la gamification normale.",
    });
  } catch (error) {
    if (error instanceof SpogomiIdentityLinkError) {
      const status = error.kind === "already_linked" ? 409 : error.kind === "not_found" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return handleApiError(error, "spogomi.identity-link.claim");
  }
}
