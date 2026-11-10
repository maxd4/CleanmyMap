import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserActiveRole, requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadSpogomiClosureSnapshot, loadSpogomiClosureSummary, setSpogomiTeamClosureDecision, transitionSpogomiEvent } from "@/lib/spogomi/closure-service";
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
const transitionSchema = z.object({
  action: z.enum(["start", "close"]),
  expectedRevision: z.number().int().nonnegative(),
}).strict();
const postSchema = z.union([decisionSchema, transitionSchema]);

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const snapshot = await loadSpogomiClosureSnapshot({ supabase, eventId });
    if (new URL(request.url).searchParams.get("format") === "json") {
      if (!snapshot) return NextResponse.json({ error: "Le diagnostic de clôture n’est pas encore disponible." }, { status: 404, headers: { "Cache-Control": "no-store" } });
      return new Response(JSON.stringify(snapshot.snapshot, null, 2), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="spogomi-${eventId}-closure-diagnostic.json"`,
        },
      });
    }
    // Cache justification : la synthèse privée et mutable ne doit jamais être servie depuis un cache partagé ou obsolète.
    return NextResponse.json({ summary: await loadSpogomiClosureSummary({ supabase, eventId }), snapshot }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.closure.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La décision de clôture SPOGOMI est invalide."] });
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    if (parsed.data.action !== "decide") {
      const activeRole = await getCurrentUserActiveRole();
      if ((activeRole !== "admin" && activeRole !== "max") || !authorized.event) return forbiddenJsonResponse();
      const result = await transitionSpogomiEvent({ supabase, eventId, transition: parsed.data.action, expectedRevision: parsed.data.expectedRevision, actorClerkId: access.userId });
      return NextResponse.json({ status: result.already_processed ? "already_processed" : "transitioned", transition: result });
    }
    const result = await setSpogomiTeamClosureDecision({ supabase, eventId, ...parsed.data, actorClerkId: access.userId });
    return NextResponse.json({ status: "recorded", decision: result });
  } catch (error) {
    return handleApiError(error, "spogomi.closure.decide");
  }
}
