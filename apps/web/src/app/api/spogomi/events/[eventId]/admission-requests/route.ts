import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  cancelSpogomiAdmissionRequest,
  createSpogomiAdmissionRequest,
  listSpogomiAdmissionRequestsForRequester,
  SpogomiAdmissionRequestError,
} from "@/lib/spogomi/admission-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const requestSchema = z.object({
  requestKind: z.enum(["registration", "presence_regularization"]),
  divisionId: z.string().uuid(),
  teamId: z.string().uuid().nullable().optional(),
  providedContext: z.string().trim().max(1200).optional(),
});
const cancelSchema = z.object({ requestId: z.string().uuid() });

function errorResponse(error: unknown) {
  if (error instanceof SpogomiAdmissionRequestError) {
    const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return handleApiError(error, "spogomi.admission-requests");
}

async function authenticate(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 8, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return validationErrorResponse({ params: ["Événement invalide."] });
  try {
    const requests = await listSpogomiAdmissionRequestsForRequester(getSupabaseServerClient(true), {
      eventId: parsed.data.eventId,
      requesterClerkId: authentication.access.userId,
    });
    return NextResponse.json({ status: "ok", requests }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const created = await createSpogomiAdmissionRequest({
      supabase: getSupabaseServerClient(true),
      eventId: parsedParams.data.eventId,
      teamId: body.data.teamId ?? null,
      divisionId: body.data.divisionId,
      requesterClerkId: authentication.access.userId,
      requestKind: body.data.requestKind,
      providedContext: body.data.providedContext,
    });
    return NextResponse.json({ status: "ok", request: created }, { status: created.status === "pending" ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const body = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const cancelled = await cancelSpogomiAdmissionRequest({
      supabase: getSupabaseServerClient(true),
      requestId: body.data.requestId,
      eventId: parsedParams.data.eventId,
      requesterClerkId: authentication.access.userId,
    });
    return NextResponse.json({ status: "ok", request: cancelled });
  } catch (error) {
    return errorResponse(error);
  }
}
