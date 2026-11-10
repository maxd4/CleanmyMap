import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { decideSpogomiRefereeApplication } from "@/lib/spogomi/referee-qualification-service";

export const runtime = "nodejs";
// Justification Vercel: organizer decisions are private mutable authorization state.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ applicationId: z.string().uuid() });
const bodySchema = z.object({ decision: z.enum(["approve", "refuse"]), reason: z.string().trim().max(2000).nullable().optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const limited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 20, window: 60 });
  if (limited) return limited;
  const params = paramsSchema.safeParse(await context.params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!params.success) return validationErrorResponse({ params: ["Candidature invalide."] });
  if (!body.success) return validationErrorResponse({ body: ["Décision invalide."] });
  try {
    const result = await decideSpogomiRefereeApplication({ supabase: getSupabaseServerClient(true), applicationId: params.data.applicationId, actorClerkId: access.userId, decision: body.data.decision, reason: body.data.reason });
    // Justification Vercel no-store: organizer decisions are private authorization state.
    return NextResponse.json({ status: "ok", result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.referee-application.decision");
  }
}
