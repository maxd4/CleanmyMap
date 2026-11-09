import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSpogomiCapability, resolveSpogomiEventAccess } from "@/lib/spogomi/authorization";
import {
  listSpogomiVolunteerHelpProposalsForOrganizer,
  SpogomiVolunteerHelpProposalError,
  transitionSpogomiVolunteerHelpProposal,
} from "@/lib/spogomi/volunteer-help-proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const decisionSchema = z.object({
  proposalId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
  decisionNote: z.string().trim().max(1200).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof SpogomiVolunteerHelpProposalError) {
    const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return handleApiError(error, "spogomi.volunteer-help-proposals.review");
}
async function authorizeOrganizer(request: Request, eventId: string) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  const eventAccess = await resolveSpogomiEventAccess({ supabase: getSupabaseServerClient(true), eventId, userId: access.userId });
  if (!eventAccess || !hasSpogomiCapability(eventAccess, "manage")) return { response: forbiddenJsonResponse() } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const authentication = await authorizeOrganizer(request, parsed.data.eventId);
  if ("response" in authentication) return authentication.response;
  try {
    const proposals = await listSpogomiVolunteerHelpProposalsForOrganizer(getSupabaseServerClient(true), parsed.data.eventId);
    return NextResponse.json({ status: "ok", proposals }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const authentication = await authorizeOrganizer(request, parsed.data.eventId);
  if ("response" in authentication) return authentication.response;
  const body = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const proposal = await transitionSpogomiVolunteerHelpProposal({
      supabase: getSupabaseServerClient(true),
      proposalId: body.data.proposalId,
      eventId: parsed.data.eventId,
      targetStatus: body.data.status,
      actorClerkId: authentication.access.userId,
      decisionNote: body.data.decisionNote,
    });
    return NextResponse.json({ status: "ok", proposal });
  } catch (error) {
    return errorResponse(error);
  }
}
