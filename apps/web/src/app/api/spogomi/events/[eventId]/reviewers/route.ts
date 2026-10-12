import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assignSpogomiReferee, revokeSpogomiReferee } from "@/lib/spogomi/result-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewerSchema = z.object({ clerkId: z.string().trim().min(3).max(128) }).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const parsed = reviewerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["L’identifiant de l’arbitre est invalide."] });
  try {
    const reviewer = await assignSpogomiReferee({ supabase: getSupabaseServerClient(true), eventId: (await context.params).eventId, clerkId: parsed.data.clerkId, assignedByClerkId: access.userId });
    return NextResponse.json({ reviewer }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.reviewer.assign");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const parsed = reviewerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["L’identifiant de l’arbitre est invalide."] });
  try {
    await revokeSpogomiReferee({ supabase: getSupabaseServerClient(true), eventId: (await context.params).eventId, clerkId: parsed.data.clerkId, assignedByClerkId: access.userId });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof Error && /forbidden/i.test(error.message)) return forbiddenJsonResponse();
    return handleApiError(error, "spogomi.reviewer.revoke");
  }
}
