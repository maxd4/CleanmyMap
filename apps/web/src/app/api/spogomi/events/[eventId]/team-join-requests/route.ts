import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserActiveRole, requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  listSpogomiTeamJoinRequestsForAdmin,
  SpogomiTeamJoinRequestError,
  transitionSpogomiTeamJoinRequest,
} from "@/lib/spogomi/team-join-requests";

export const runtime = "nodejs";
// Justification Vercel: admin-only team join requests are private and must remain fresh per request.
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  matchedParticipantId: z.string().uuid().optional(),
  verificationNote: z.string().trim().min(10).max(1200).optional(),
  resolutionNote: z.string().trim().max(1200).optional(),
});
const eventParamsSchema = z.object({ eventId: z.string().uuid() });
type AdminAuthorizationResult =
  | { response: Response }
  | { access: { ok: true; userId: string }; activeRole: "admin" | "max" };

async function requireTeamJoinAdmin(request: Request): Promise<AdminAuthorizationResult> {
  const access = await requireAdminAccess();
  if (!access.ok) return { response: adminAccessErrorJsonResponse(access) } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  const activeRole = await getCurrentUserActiveRole();
  if (activeRole !== "admin" && activeRole !== "max") {
    return { response: adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" }) } as const;
  }
  return { access, activeRole } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  const authorization = await requireTeamJoinAdmin(request);
  if ("response" in authorization) return authorization.response;
  try {
    const parsedParams = eventParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
    const eventId = parsedParams.data.eventId;
    const requests = await listSpogomiTeamJoinRequestsForAdmin(getSupabaseServerClient(true), eventId);
    return NextResponse.json({ status: "ok", requests });
  } catch (error) {
    return handleApiError(error, "spogomi.team-join-requests.admin-list");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  const authorization = await requireTeamJoinAdmin(request);
  if ("response" in authorization) return authorization.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse({ body: ["Décision invalide."] });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  if (parsed.data.status === "approved" && (!parsed.data.matchedParticipantId || !parsed.data.verificationNote)) {
    return validationErrorResponse({ verificationNote: ["Une identité du roster et une vérification indépendante sont requises."] });
  }
  try {
    const parsedParams = eventParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
    const eventId = parsedParams.data.eventId;
    const requestRecord = await transitionSpogomiTeamJoinRequest({
      supabase: getSupabaseServerClient(true),
      requestId: parsed.data.requestId,
      eventId,
      targetStatus: parsed.data.status,
      actorKind: "admin",
      actorClerkId: authorization.access.userId,
      actorRole: authorization.activeRole,
      matchedParticipantId: parsed.data.matchedParticipantId,
      verificationNote: parsed.data.verificationNote,
      resolutionNote: parsed.data.resolutionNote,
    });
    return NextResponse.json({ status: "ok", request: requestRecord });
  } catch (error) {
    if (error instanceof SpogomiTeamJoinRequestError) {
      const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return handleApiError(error, "spogomi.team-join-requests.admin-decide");
  }
}
