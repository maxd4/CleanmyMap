import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { loadSpogomiResultsProjection } from "@/lib/spogomi/results-projection-service";
import { buildXlsxWorkbook, safeXlsxFilename } from "@/lib/reports/xlsx-export";

export const runtime = "nodejs";
// Justification force-dynamic: organizer export reads private current certification and must never be served from a shared cache.
export const dynamic = "force-dynamic";

function value(value: number | string | null): number | string | null {
  return value === undefined ? null : value;
}

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    const projection = await loadSpogomiResultsProjection({ supabase, eventId: event.id });
    if (!projection) return NextResponse.json({ error: "Projection SPOGOMI indisponible." }, { status: 404 });
    const certifiedTeams = projection.teams.filter((team) => team.submissionStatus === "certified");
    const categoryRows = certifiedTeams.flatMap((team) => team.categories.map((category) => [
      team.teamNumber, team.publicName, team.submissionStatus, category.code, category.label, category.measurementKind, category.unit,
      value(category.quantity), value(category.massGrams), value(category.objectCount), category.environmentalCategorySlug, category.provenance, category.measurementMethod,
    ]));
    const traceRows = [
      ["Règlement", projection.regulation.version, "Statut", projection.regulation.status, "Source", projection.regulation.sourceReference],
      ["Visibilité publique", projection.results.visibility, "Classement sportif", projection.results.sport.status, "Classement mégots", projection.results.butts.status],
      ["Projection environnementale", projection.results.environmental.projectionVersion, "Hash source", projection.results.environmental.sourceHash, "Soumissions certifiées", projection.sourceSubmissionIds.join(", ")],
      ...projection.teams.map((team) => ["Équipe", team.teamNumber, "Soumission", team.submissionStatus, "Données exportées", team.submissionStatus === "certified" ? "oui" : "non — non certifiée"]),
    ];
    const rows = [
      { name: "Synthèse", rows: [["Champ", "Valeur"], ["Événement", projection.event.name], ["Mode", projection.event.mode], ["Début", projection.event.startsAt], ["Fin", projection.event.endsAt], ["Équipes", projection.teams.length], ["Équipes certifiées", certifiedTeams.length], ["Participants présents", projection.results.environmental.participantsPresent], ["Masse hors mégots (g)", projection.results.environmental.totalWasteMassGrams], ["Mégots comptés", projection.results.environmental.cigaretteButtsCount], ["Masse mégots (g)", projection.results.environmental.cigaretteButtsMassGrams], ["Révision environnementale", projection.results.environmental.projectionVersion], ["Statut événement", projection.event.state]] },
      { name: "Équipes", rows: [["N°", "Nom public", "Inscrits", "Présents", "Soumission", "Version", "Rang sportif", "Statut sportif", "Points certifiés", "Rang mégots", "Statut mégots", "Mégots comptés certifiés", "Mégots / participant certifié"], ...projection.teams.map((team) => [team.teamNumber, team.publicName, team.registeredParticipants, team.presentParticipants, team.submissionStatus, team.submissionVersion, team.sportRank, team.sportStatus, team.sportScore, team.buttsRank, team.buttsStatus, team.buttsCount, team.buttsPerParticipant])] },
      { name: "Catégories", rows: [["Équipe", "Nom public", "Statut soumission", "Code", "Catégorie", "Type", "Unité", "Quantité", "Masse (g)", "Comptage direct", "Mapping CleanMyMap", "Provenance", "Méthode"], ...categoryRows] },
      { name: "Traçabilité", rows: [["Type", "Valeur 1", "Type", "Valeur 2", "Type", "Valeur 3"], ...traceRows] },
    ];
    const bytes = buildXlsxWorkbook(rows);
    const filename = safeXlsxFilename(`spogomi-${projection.event.name}`);
    // Justification no-store: this private workbook contains organizer-only certification and measurement data.
    return new NextResponse(bytes as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.export.xlsx");
  }
}
