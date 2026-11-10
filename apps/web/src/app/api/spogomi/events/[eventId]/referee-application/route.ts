import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSpogomiRefereeApplication, loadSpogomiRefereeApplication } from "@/lib/spogomi/referee-qualification-service";

export const runtime = "nodejs";
// Justification Vercel: referee candidatures contain private, revision-sensitive
// qualification state and must never be served from a shared cache.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const bodySchema = z.object({ divisionId: z.string().uuid() }).strict();

async function authenticate(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const limited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 20, window: 60 });
  if (limited) return { response: limited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const params = paramsSchema.safeParse(await context.params);
  const divisionId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("divisionId"));
  if (!params.success || !divisionId.success) return validationErrorResponse({ params: ["Édition ou division invalide."] });
  try {
    const application = await loadSpogomiRefereeApplication({ supabase: getSupabaseServerClient(true), eventId: params.data.eventId, divisionId: divisionId.data, clerkId: authentication.access.userId });
    // Justification Vercel no-store: the authenticated candidate projection is private.
    return NextResponse.json({ status: "ok", application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.referee-application.load");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success) return validationErrorResponse({ params: ["Édition invalide."] });
  if (!body.success) return validationErrorResponse({ body: ["Division invalide."] });
  try {
    const application = await createSpogomiRefereeApplication({ supabase: getSupabaseServerClient(true), eventId: params.data.eventId, divisionId: body.data.divisionId, clerkId: authentication.access.userId });
    // Justification Vercel no-store: the mutation response contains private qualification state.
    return NextResponse.json({ status: "ok", application }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.referee-application.create");
  }
}
