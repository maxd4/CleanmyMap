import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSpogomiDivisionProjections } from "@/lib/spogomi/results-projection";
import { loadSpogomiResultsProjection } from "@/lib/spogomi/results-projection-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { isSpogomiTeamNonParticipating } from "@/lib/spogomi/closure";

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
    const divisionProjections = projection ? getSpogomiDivisionProjections(projection) : [];
    if (!projection || !divisionProjections.every((division) => division.results.regulationComplete) || projection.teams.some((team) => team.sportEligible && team.submissionStatus !== "certified") || projection.teams.some((team) => !team.sportEligible && !isSpogomiTeamNonParticipating(team.closureStatus) && team.closureStatus !== "excluded" && team.closureStatus !== "disqualified")) {
      return NextResponse.json({ error: "Chaque équipe éligible doit disposer d’un résultat certifié et les équipes non participantes doivent être explicitement qualifiées." }, { status: 409 });
    }
    // Mixed editions publish one division at a time. This is an explicit
    // PARTIAL_ALLOWED boundary: a later division may fail after an earlier
    // division committed, but the response must never claim full publication.
    const published = [];
    for (const divisionProjection of divisionProjections) {
      const divisionId = divisionProjection.event.divisions?.length === 1
        ? divisionProjection.event.divisions[0].id
        : divisionProjection.teams.find((team) => team.divisionId)?.divisionId ?? null;
      if (!divisionId) return NextResponse.json({ error: "La division SPOGOMI est absente ou incohérente." }, { status: 409 });
      const rankings = [
        ...divisionProjection.results.sport.entries.filter((entry) => entry.rank !== null && entry.eligible && entry.teamId).map((entry) => ({ kind: "points" as const, teamId: entry.teamId!, divisionId, rank: entry.rank!, teamEligible: true })),
        ...divisionProjection.results.butts.entries.filter((entry) => entry.rank !== null && entry.eligible && entry.teamId).map((entry) => ({ kind: "butts" as const, teamId: entry.teamId!, divisionId, rank: entry.rank!, teamEligible: true })),
      ];
      const source = { snapshot: divisionProjection.publicationSourceSnapshot, teams: divisionProjection.teams.map((team) => ({ divisionId, teamId: team.teamId, team: team.teamNumber, submission: team.submissionVersion, present: team.presentParticipants })) };
      const decisionVersion = createHash("sha256").update(JSON.stringify({ divisionId, regulation: divisionProjection.regulation, source, rankings })).digest("hex");
      const result = await supabase.rpc("publish_spogomi_official_rankings_for_division_checked_closure", { p_event_id: event.id, p_division_id: divisionId, p_decision_version: decisionVersion, p_source_reference: `spogomi:official-rankings:${event.id}:${divisionId}:${decisionVersion}`, p_rankings: rankings, p_actor_clerk_id: access.userId, p_source_snapshot: divisionProjection.publicationSourceSnapshot });
      if (result.error && published.length > 0) {
        return NextResponse.json({
          status: "partial",
          rankings: published.reduce((sum, item) => sum + item.count, 0),
          divisions: published,
          failedDivisions: [{ divisionId, status: "failed" }],
        }, { status: 409 });
      }
      if (result.error) throw result.error;
      published.push({ divisionId, decisionVersion, count: Number(result.data ?? 0) });
    }
    return NextResponse.json({ status: "published", rankings: published.reduce((sum, item) => sum + item.count, 0), divisions: published });
  } catch (error) {
    return handleApiError(error, "spogomi.rankings.publish");
  }
}
