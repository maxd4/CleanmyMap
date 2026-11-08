import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiOperationalCertificationProofsForUser } from "./field-operations-service";
import { buildSpogomiOrientationProgress, type SpogomiOrientationProgressProof } from "./orientation-progress";
import { listSpogomiEventsForUser } from "./personal-events-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

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
  return buildSpogomiOrientationProgress({ userId, personalEvents, volunteerSummary, operationalCertifications });
}
