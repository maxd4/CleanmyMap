import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { loadSpogomiResultsProjection } from "@/lib/spogomi/results-projection-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    if (event.state !== "certified") return NextResponse.json({ error: "L’événement doit être certifié avant publication des classements." }, { status: 409 });
    const projection = await loadSpogomiResultsProjection({ supabase, eventId: event.id, visibilityOverride: "provisional" });
    if (!projection || !projection.results.regulationComplete || projection.teams.some((team) => team.submissionStatus !== "certified")) {
      return NextResponse.json({ error: "Chaque équipe doit disposer d’un résultat certifié et d’un règlement complet." }, { status: 409 });
    }
    const teamIdByNumber = new Map(projection.teams.map((team) => [team.teamNumber, team.teamId]));
    const rankings = [
      ...projection.results.sport.entries.filter((entry) => entry.rank !== null && entry.eligible).map((entry) => ({ kind: "points" as const, teamId: teamIdByNumber.get(entry.teamNumber) ?? null, rank: entry.rank, teamEligible: true })),
      ...projection.results.butts.entries.filter((entry) => entry.rank !== null && entry.eligible).map((entry) => ({ kind: "butts" as const, teamId: teamIdByNumber.get(entry.teamNumber) ?? null, rank: entry.rank, teamEligible: true })),
    ];
    const source = projection.teams.map((team) => ({ team: team.teamNumber, submission: team.submissionVersion, sport: team.sportScore, butts: team.buttsCount })).sort((left, right) => left.team - right.team);
    const decisionVersion = createHash("sha256").update(JSON.stringify({ regulation: projection.regulation.version, source, rankings })).digest("hex");
    const result = await supabase.rpc("publish_spogomi_official_rankings", { p_event_id: event.id, p_decision_version: decisionVersion, p_source_reference: `spogomi:official-rankings:${event.id}:${decisionVersion}`, p_rankings: rankings, p_actor_clerk_id: access.userId });
    if (result.error) throw result.error;
    return NextResponse.json({ status: "published", rankings: Number(result.data ?? 0), decisionVersion });
  } catch (error) {
    return handleApiError(error, "spogomi.rankings.publish");
  }
}
