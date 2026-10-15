import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  assignSpogomiObserver,
  assignSpogomiReferee,
  revokeSpogomiObserver,
  revokeSpogomiReferee,
  assignSpogomiCheckin,
  revokeSpogomiCheckin,
} from "@/lib/spogomi/result-service";

export const runtime = "nodejs";
// Justification Vercel: reviewer assignments are sensitive mutable authorization state.
export const dynamic = "force-dynamic";

const reviewerSchema = z.object({
  clerkId: z.string().trim().min(3).max(128),
  role: z.enum(["observer", "referee", "checkin"]).default("referee"),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const parsed = reviewerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["L’identifiant ou l’habilitation SPOGOMI est invalide."] });
  try {
    const params = { supabase: getSupabaseServerClient(true), eventId: (await context.params).eventId, clerkId: parsed.data.clerkId, assignedByClerkId: access.userId };
    const reviewer = parsed.data.role === "observer"
      ? await assignSpogomiObserver(params)
      : parsed.data.role === "checkin"
        ? await assignSpogomiCheckin(params)
        : await assignSpogomiReferee(params);
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
  if (!parsed.success) return validationErrorResponse({ body: ["L’identifiant ou l’habilitation SPOGOMI est invalide."] });
  try {
    const params = { supabase: getSupabaseServerClient(true), eventId: (await context.params).eventId, clerkId: parsed.data.clerkId, assignedByClerkId: access.userId };
    if (parsed.data.role === "observer") await revokeSpogomiObserver(params);
    else if (parsed.data.role === "checkin") await revokeSpogomiCheckin(params);
    else await revokeSpogomiReferee(params);
    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof Error && /forbidden/i.test(error.message)) return forbiddenJsonResponse();
    return handleApiError(error, "spogomi.reviewer.revoke");
  }
}
