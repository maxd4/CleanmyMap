import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  claimSpogomiIdentityLink,
  loadSpogomiIdentityState,
  resumeSpogomiIdentityParticipation,
  SpogomiIdentityLinkError,
} from "@/lib/spogomi/identity-link";
import { loadSpogomiEventRecognitionForUser } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";
// Justification Vercel: identity-link state is sensitive and changes after each verified claim.
export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: z.string().trim().min(16).max(100).optional() });
type RouteContext = { params: Promise<{ eventId: string }> };

async function authenticateIdentityLinkRequest(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 8, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: RouteContext) {
  const authentication = await authenticateIdentityLinkRequest(request);
  if ("response" in authentication) return authentication.response;

  try {
    const { eventId } = await context.params;
    const state = await loadSpogomiIdentityState(getSupabaseServerClient(true), {
      eventId,
      clerkId: authentication.access.userId,
    });
    const recognition = state.participantId
      ? await loadSpogomiEventRecognitionForUser(getSupabaseServerClient(true), {
        eventId,
        userId: authentication.access.userId,
      })
      : null;
    return NextResponse.json({ status: "ok", ...state, recognition });
  } catch (error) {
    return handleApiError(error, "spogomi.identity-link.read");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authentication = await authenticateIdentityLinkRequest(request);
  if ("response" in authentication) return authentication.response;
  const { access } = authentication;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationErrorResponse({ code: ["Demande de liaison invalide."] });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  try {
    const { eventId } = await context.params;
    const supabase = getSupabaseServerClient(true);
    if (parsed.data.code) {
      const link = await claimSpogomiIdentityLink(supabase, {
        eventId,
        code: parsed.data.code,
        clerkId: access.userId,
      });
      const state = await loadSpogomiIdentityState(supabase, {
        eventId,
        clerkId: access.userId,
      });
      const recognition = state.participantId
        ? await loadSpogomiEventRecognitionForUser(supabase, { eventId, userId: access.userId })
        : null;
      return NextResponse.json({
        status: "ok",
        linkStatus: link.linkStatus,
        ...state,
        recognition,
        note: "La liaison du compte ne confirme pas la présence. Utilisez ensuite la demande de participation ; seule la confirmation organisateur déclenche la gamification normale.",
      });
    }

    const state = await resumeSpogomiIdentityParticipation(supabase, {
      eventId,
      clerkId: access.userId,
    });
    const recognition = state.participantId
      ? await loadSpogomiEventRecognitionForUser(supabase, { eventId, userId: access.userId })
      : null;
    return NextResponse.json({
      status: "ok",
      ...state,
      recognition,
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
