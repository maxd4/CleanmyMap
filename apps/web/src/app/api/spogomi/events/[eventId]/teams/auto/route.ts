import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { autoComposeTeams } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { z } from "zod";

export const runtime = "nodejs";
// Justification Vercel: automatic team assignment mutates event state and must be evaluated dynamically.
export const dynamic = "force-dynamic";

const formationSchema = z.object({
  teams: z.array(z.object({
    draftKey: z.string().min(1).max(100),
    teamNumber: z.number().int().min(1),
    participantIds: z.array(z.string().uuid()).min(1).max(100),
    compositionState: z.enum(["draft", "locked", "verified"]),
    explanation: z.enum(["same_order_trio", "remainder_repacked"]),
  }).strict()).max(100),
  unassignedParticipantIds: z.array(z.string().uuid()).max(100),
  reasons: z.record(z.string(), z.enum(["group_exceeds_team_size", "team_size_required", "incomplete_team", "casual_bounds_no_fit"])),
  explanation: z.array(z.string().max(500)).max(20),
}).strict();
const divisionIdSchema = z.string().uuid();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const { event } = authorized;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const divisionId = typeof body.divisionId === "string" && divisionIdSchema.safeParse(body.divisionId).success ? body.divisionId : undefined;
    if (event.mode === "mixed" && !divisionId) return NextResponse.json({ error: "Une division explicite est requise pour composer un événement mixte." }, { status: 400 });
    const divisionResult = divisionId ? await supabase.from("spogomi_divisions").select("id, division_type").eq("event_id", event.id).eq("id", divisionId).maybeSingle() : { data: null, error: null };
    if (divisionResult.error) throw divisionResult.error;
    if (divisionId && !divisionResult.data) return NextResponse.json({ error: "Division SPOGOMI introuvable." }, { status: 404 });
    const division = divisionResult.data ?? undefined;
    const confirm = body.confirm === true;
    if (!confirm) return NextResponse.json(await autoComposeTeams(supabase, event, undefined, division));
    if (typeof body.proposalFingerprint !== "string" || typeof body.expectedRevision !== "number" || !Number.isInteger(body.expectedRevision)) {
      return NextResponse.json({ error: "La confirmation exige l'empreinte et la révision de l'aperçu." }, { status: 400 });
    }
    const parsedFormation = body.formation === undefined ? { success: true as const, data: undefined } : formationSchema.safeParse(body.formation);
    if (!parsedFormation.success) return NextResponse.json({ error: "La composition proposée est invalide." }, { status: 400 });
    return NextResponse.json(await autoComposeTeams(supabase, event, {
      proposalFingerprint: body.proposalFingerprint,
      expectedRevision: body.expectedRevision,
      actorClerkId: access.userId,
      formation: parsedFormation.data,
      division,
    }));
  } catch (error) {
    return handleApiError(error, "spogomi.teams.auto");
  }
}
