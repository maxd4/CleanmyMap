import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadSpogomiResultsProjection } from "@/lib/spogomi/results-projection-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification force-dynamic: authenticated publication must read the current certified event and source snapshot.
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    const { event } = authorized;
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
    const sportByTeam = new Map(projection.results.sport.entries.map((entry) => [entry.teamNumber, entry]));
    const buttsByTeam = new Map(projection.results.butts.entries.map((entry) => [entry.teamNumber, entry]));
    const source = {
      snapshot: projection.publicationSourceSnapshot,
      teams: projection.teams.map((team) => ({
        team: team.teamNumber,
        submission: team.submissionVersion,
        present: team.presentParticipants,
        sport: sportByTeam.get(team.teamNumber)?.score ?? null,
        butts: buttsByTeam.get(team.teamNumber)?.ratio ?? null,
      })).sort((left, right) => left.team - right.team),
    };
    const decisionVersion = createHash("sha256").update(JSON.stringify({ regulation: projection.regulation, source, rankings })).digest("hex");
    const result = await supabase.rpc("publish_spogomi_official_rankings_checked", { p_event_id: event.id, p_decision_version: decisionVersion, p_source_reference: `spogomi:official-rankings:${event.id}:${decisionVersion}`, p_rankings: rankings, p_actor_clerk_id: access.userId, p_source_snapshot: projection.publicationSourceSnapshot });
    if (result.error) throw result.error;
    return NextResponse.json({ status: "published", rankings: Number(result.data ?? 0), decisionVersion });
  } catch (error) {
    return handleApiError(error, "spogomi.rankings.publish");
  }
}
