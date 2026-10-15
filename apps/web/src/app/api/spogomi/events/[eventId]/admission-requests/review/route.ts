import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserActiveRole, requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  listSpogomiAdmissionRequestsForAdmin,
  SpogomiAdmissionRequestError,
  transitionSpogomiAdmissionRequest,
} from "@/lib/spogomi/admission-requests";

export const runtime = "nodejs";
// Justification Vercel: la file de demandes et ses décisions dépendent du
// rôle admin|max courant et de l'état transactionnel de l'événement.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const bodySchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  verificationNote: z.string().trim().min(10).max(1200).optional(),
  resolutionNote: z.string().trim().max(1200).optional(),
  decisionMessage: z.string().trim().max(1200).optional(),
});

async function requireAdmissionAdmin(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return { response: adminAccessErrorJsonResponse(access) } as const;
  const activeRole = await getCurrentUserActiveRole();
  if (activeRole !== "admin" && activeRole !== "max") {
    return { response: adminAccessErrorJsonResponse({ ok: false, status: 403, error: "Forbidden" }) } as const;
  }
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  return { access, activeRole } as const;
}

function errorResponse(error: unknown) {
  if (error instanceof SpogomiAdmissionRequestError) {
    const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return handleApiError(error, "spogomi.admission-requests.review");
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authorization = await requireAdmissionAdmin(request);
  if ("response" in authorization) return authorization.response;
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return validationErrorResponse({ params: ["Événement invalide."] });
  try {
    const requests = await listSpogomiAdmissionRequestsForAdmin(getSupabaseServerClient(true), parsed.data.eventId);
    // Justification no-store: la projection d'administration est privée et
    // doit rester fraîche après chaque transition de demande.
    return NextResponse.json({ status: "ok", requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authorization = await requireAdmissionAdmin(request);
  if ("response" in authorization) return authorization.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  if (body.data.status === "approved" && !body.data.verificationNote) {
    return validationErrorResponse({ verificationNote: ["Une preuve interne d’au moins 10 caractères est requise."] });
  }
  try {
    const decision = await transitionSpogomiAdmissionRequest({
      supabase: getSupabaseServerClient(true),
      requestId: body.data.requestId,
      eventId: parsedParams.data.eventId,
      targetStatus: body.data.status,
      actorClerkId: authorization.access.userId,
      actorRole: authorization.activeRole,
      verificationNote: body.data.verificationNote,
      resolutionNote: body.data.resolutionNote,
      decisionMessage: body.data.decisionMessage,
    });
    return NextResponse.json({ status: "ok", request: decision });
  } catch (error) {
    return errorResponse(error);
  }
}
