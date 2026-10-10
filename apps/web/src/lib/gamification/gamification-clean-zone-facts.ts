import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCleanZoneRowsForUser } from "./badges/listing";
import { collectEligibleCleanZoneSources } from "./clean-zones";
import { sourceFact } from "./gamification-fact-builders";
import { occurredOnFrom } from "./gamification-fact-timestamps";
import type { GamificationSourceFact } from "./gamification-reconstruction";

export async function loadCleanZoneFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationSourceFact[]> {
  const cleanPlaces = await loadCleanZoneRowsForUser(supabase, userId);
  const cleanPlacesById = new Map(cleanPlaces.map((row) => [row.id, row]));
  return collectEligibleCleanZoneSources({ cleanPlaces, progressionEvents: [] }).map((source) =>
    sourceFact({
      mechanicId: "clean_zones",
      eventType: "clean_zone_task",
      sourceTable: source.progressionSourceTable,
      sourceId: source.progressionSourceId,
      occurredOn: occurredOnFrom(
        cleanPlacesById.get(source.sourceId)?.validated_at ??
          cleanPlacesById.get(source.sourceId)?.cleaned_at,
      ),
      xpAwarded: 1,
      metadata: { canonicalPlaceKey: source.canonicalPlaceKey, provenance: source.provenance },
    }),
  );
}
