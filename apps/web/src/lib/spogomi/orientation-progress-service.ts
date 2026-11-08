import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildSpogomiOrientationProgress, type SpogomiOrientationProgressProof } from "./orientation-progress";
import { listSpogomiEventsForUser } from "./personal-events-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

export async function loadSpogomiOrientationProgressForCurrentUser(userId: string): Promise<SpogomiOrientationProgressProof[]> {
  const supabase = getSupabaseServerClient(true);
  const [personalEvents, volunteerSummary] = await Promise.all([
    listSpogomiEventsForUser(supabase, userId),
    loadSpogomiVolunteerSummaryForUser(supabase, userId),
  ]);
  return buildSpogomiOrientationProgress({ personalEvents, volunteerSummary });
}
