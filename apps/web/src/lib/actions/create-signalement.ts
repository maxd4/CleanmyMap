import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { emitSpotCreated } from "@/lib/events/emit";
import { invalidatePublicSurfaceSnapshotsByRoute } from "@/lib/public-surface-snapshots";
import { trackServerEvent } from "@/lib/analytics.server";
import { trackSpotCreated } from "@/lib/gamification/progression";
import { logFailure } from "@/lib/logging/failure-log";

export type SignalementType = "clean_place" | "spot";

export type CreateSignalementParams = {
  userId: string;
  type: SignalementType;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  actorName: string;
  consentGranted: boolean;
};

export type CreatedSignalement = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  user_id?: string | null;
  label: string;
  spot_type: SignalementType;
  latitude: number | null;
  longitude: number | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

const SIGNALEMENT_SELECT =
  "id, created_at, created_by_clerk_id, user_id, label, spot_type, latitude, longitude, status, notes";

/**
 * Création métier canonique d'un signalement.
 *
 * Les routes HTTP ne doivent pas connaître la table de persistance : toute
 * nouvelle création de spot ou de clean place passe par cette capacité afin
 * de rester visible dans les flux unifiés et dans la progression utilisateur.
 */
export async function createSignalement(
  supabase: SupabaseClient,
  params: CreateSignalementParams,
): Promise<CreatedSignalement> {
  const label = params.label.trim();
  const notePrefix = `[spot-by:${params.actorName}]`;
  const composedNotes = params.notes?.trim()
    ? `${notePrefix} ${params.notes.trim()}`
    : notePrefix;

  const inserted = await supabase
    .from("trash_spotter_spots")
    .insert({
      created_by_clerk_id: params.userId,
      user_id: params.userId,
      label,
      spot_type: params.type,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      status: "new",
      notes: composedNotes,
    })
    .select(SIGNALEMENT_SELECT)
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  const signalement = inserted.data as CreatedSignalement;
  revalidateTag("spots-map", "max");

  try {
    await invalidatePublicSurfaceSnapshotsByRoute(["api/actions", "api/actions/map"]);
  } catch (snapshotError) {
    logFailure(
      "Actions/CreateSignalement",
      "Public action snapshots invalidation failed",
      snapshotError,
      { signalementId: signalement.id },
    );
  }

  try {
    await trackSpotCreated(supabase, {
      userId: params.userId,
      spotId: String(signalement.id),
    });
  } catch (progressionError) {
    logFailure(
      "Actions/CreateSignalement",
      "Progression tracking failed",
      progressionError,
      { signalementId: signalement.id, userId: params.userId },
    );
  }

  void emitSpotCreated({
    spotId: String(signalement.id),
    userId: params.userId,
    label: signalement.label,
    wasteType: signalement.spot_type,
  });

  if (params.consentGranted) {
    await trackServerEvent(
      params.userId,
      "spot_created",
      {
        waste_type: signalement.spot_type,
        location: signalement.label,
      },
      { consentGranted: true },
    );
  }

  return signalement;
}
