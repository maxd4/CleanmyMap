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
    const divisionResults = projection?.results.divisions ?? [{ regulationComplete: projection?.results.regulationComplete ?? false }];
    if (!projection || !divisionResults.every((division) => division.regulationComplete) || projection.teams.some((team) => team.submissionStatus !== "certified")) {
      return NextResponse.json({ error: "Chaque équipe doit disposer d’un résultat certifié et d’un règlement complet." }, { status: 409 });
    }
    const rankingEntries = [
      ...projection.results.sport.entries.filter((entry) => entry.rank !== null && entry.eligible).map((entry) => ({ kind: "points" as const, teamId: entry.teamId ?? null, divisionId: entry.divisionId ?? null, rank: entry.rank, teamEligible: true })),
      ...projection.results.butts.entries.filter((entry) => entry.rank !== null && entry.eligible).map((entry) => ({ kind: "butts" as const, teamId: entry.teamId ?? null, divisionId: entry.divisionId ?? null, rank: entry.rank, teamEligible: true })),
    ];
    const divisionIds = projection.event.divisions?.map((division) => division.id)
      ?? [...new Set(projection.teams.map((team) => team.divisionId).filter((value): value is string => Boolean(value)))];
    const source = { snapshot: projection.publicationSourceSnapshot, teams: projection.teams.map((team) => ({ divisionId: team.divisionId, teamId: team.teamId, team: team.teamNumber, submission: team.submissionVersion, present: team.presentParticipants })) };
    const published = [];
    for (const divisionId of divisionIds) {
      const rankings = rankingEntries.filter((entry) => entry.divisionId === divisionId && entry.teamId).map((entry) => ({ ...entry, teamId: entry.teamId!, divisionId }));
      const decisionVersion = createHash("sha256").update(JSON.stringify({ divisionId, regulation: projection.regulation, source, rankings })).digest("hex");
      const result = await supabase.rpc("publish_spogomi_official_rankings_for_division", { p_event_id: event.id, p_division_id: divisionId, p_decision_version: decisionVersion, p_source_reference: `spogomi:official-rankings:${event.id}:${divisionId}:${decisionVersion}`, p_rankings: rankings, p_actor_clerk_id: access.userId, p_source_snapshot: projection.publicationSourceSnapshot });
      if (result.error) throw result.error;
      published.push({ divisionId, decisionVersion, count: Number(result.data ?? 0) });
    }
    return NextResponse.json({ status: "published", rankings: published.reduce((sum, item) => sum + item.count, 0), divisions: published });
  } catch (error) {
    return handleApiError(error, "spogomi.rankings.publish");
  }
}
