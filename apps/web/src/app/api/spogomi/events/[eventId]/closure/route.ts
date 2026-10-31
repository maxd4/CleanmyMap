import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadSpogomiClosureSummary, setSpogomiTeamClosureDecision } from "@/lib/spogomi/closure-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Vercel justification : cette consultation privée relit les décisions de clôture mutables et l'autorisation organisateur à chaque requête.
// Le rendu doit rester dynamique pour ne jamais servir une synthèse de clôture obsolète ou partagée.
export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  action: z.literal("decide"),
  divisionId: z.string().uuid(),
  teamId: z.string().uuid(),
  status: z.enum(["present_measured", "absent", "forfeit", "excluded", "disqualified", "result_missing", "contested"]),
  sportEligible: z.boolean(),
  environmentalEligibility: z.enum(["eligible", "excluded", "unknown"]),
  reason: z.string().trim().min(1).max(2000),
  decisionVersion: z.number().int().positive(),
}).strict();

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    // Cache justification : la synthèse privée et mutable ne doit jamais être servie depuis un cache partagé ou obsolète.
    return NextResponse.json({ summary: await loadSpogomiClosureSummary({ supabase, eventId }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.closure.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La décision de clôture SPOGOMI est invalide."] });
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const result = await setSpogomiTeamClosureDecision({ supabase, eventId, ...parsed.data, actorClerkId: access.userId });
    return NextResponse.json({ status: "recorded", decision: result });
  } catch (error) {
    return handleApiError(error, "spogomi.closure.decide");
  }
}
