import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiOperationalCertificationProofsForUser } from "./field-operations-service";
import { buildSpogomiOrientationProgress, type SpogomiOrientationProgressProof, type SpogomiPublishedResultsProgressProof } from "./orientation-progress";
import { listSpogomiEventsForUser } from "./personal-events-service";
import { loadPublishedSpogomiEventResultsBySlug } from "./public-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

async function loadPublishedResultsProgressProofs(
  supabase: Parameters<typeof loadPublishedSpogomiEventResultsBySlug>[1],
  events: readonly Awaited<ReturnType<typeof listSpogomiEventsForUser>>[number][],
): Promise<SpogomiPublishedResultsProgressProof[]> {
  const organizerEvents = events.filter((event) => event.relations.includes("organizer") && event.eventSlug?.trim() && event.publicVisibility === "published" && event.state !== "cancelled");
  const proofs: Array<SpogomiPublishedResultsProgressProof | null> = await Promise.all(organizerEvents.map(async (event) => {
    const results = await loadPublishedSpogomiEventResultsBySlug(event.eventSlug!, supabase);
    if (!results) return null;
    return {
      eventId: event.id,
      visibility: results.visibility,
      sportStatus: results.sport.status,
      divisionSportStatuses: results.divisions?.map((division) => division.sport.status),
    } satisfies SpogomiPublishedResultsProgressProof;
  }));
  return proofs.filter((proof): proof is SpogomiPublishedResultsProgressProof => proof !== null);
}

export async function loadSpogomiOrientationProgressForCurrentUser(userId: string): Promise<SpogomiOrientationProgressProof[]> {
  const supabase = getSupabaseServerClient(true);
  const [personalEvents, volunteerSummary] = await Promise.all([
    listSpogomiEventsForUser(supabase, userId),
    loadSpogomiVolunteerSummaryForUser(supabase, userId),
  ]);
  const operationalCertifications = await loadSpogomiOperationalCertificationProofsForUser({
    supabase,
    userId,
    eventIds: personalEvents.map((event) => event.id),
  });
  const publishedResults = await loadPublishedResultsProgressProofs(supabase, personalEvents);
  return buildSpogomiOrientationProgress({ userId, personalEvents, volunteerSummary, operationalCertifications, publishedResults });
}
