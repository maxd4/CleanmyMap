import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { rebuildUserGamificationBadges } from "@/lib/gamification/badges/rebuild";
import {
  refreshProgressionProfile,
  syncUserActionProgression,
} from "@/lib/gamification/progression-tracking";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import type { ModerationSupabaseClient } from "./route.shared";

export async function refreshActionImpactProgressionDependents(
  supabase: ModerationSupabaseClient,
  params: {
    actionId: string;
    creatorUserId: string | null;
  },
): Promise<string[]> {
  const organizerIds = await loadActionOrganizerIdsForAction(
    supabase,
    params.actionId,
    params.creatorUserId,
  );
  const affectedUserIds = Array.from(
    new Set(organizerIds.map((value) => value.trim()).filter(Boolean)),
  );

  await Promise.all(
    affectedUserIds.map(async (userId) => {
      await syncUserActionProgression(supabase, userId);
      await rebuildUserGamificationBadges(supabase, userId);
      await refreshProgressionProfile(supabase, userId);
    }),
  );
  await invalidatePublicSurfaceSnapshotsByRoute([
    "api/actions",
    "api/actions/map",
  ]);

  return affectedUserIds;
}
