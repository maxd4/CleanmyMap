import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "./preparation-service";
import type { SpogomiEventMode } from "./types";

export type SpogomiEventUpdateInput = {
  name?: string;
  locationLabel?: string;
  startsAt?: string;
  endsAt?: string | null;
  mode?: SpogomiEventMode;
  casualTeamSize?: number | null;
  publicVisibility?: "private" | "published";
  publicResultsVisibility?: "hidden" | "provisional" | "certified";
};

function validateEventUpdate(event: EventRow, input: SpogomiEventUpdateInput, name: string, locationLabel: string, startsAt: string, endsAt: string | null): void {
  if (!name || !locationLabel) throw new Error("Validation: nom et lieu obligatoires.");
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) throw new Error("Validation: la fin doit être postérieure au début.");
  if (input.publicVisibility === "published" && (!event.event_slug || !startsAt)) throw new Error("Validation: un événement publié doit avoir un identifiant et une date.");
  if (input.publicVisibility === "published" && event.state === "draft") throw new Error("Validation: un brouillon doit d'abord quitter l'état draft avant publication.");
}

function normalizeEventUpdate(event: EventRow, input: SpogomiEventUpdateInput) {
  const name = input.name?.trim() || event.name;
  const locationLabel = input.locationLabel?.trim() || event.location_label;
  const startsAt = input.startsAt ?? event.starts_at;
  const endsAt = input.endsAt === undefined ? event.ends_at : input.endsAt;
  validateEventUpdate(event, input, name, locationLabel, startsAt, endsAt);
  const currentCasual = event.team_size_config?.casual ?? {};
  const teamSizeConfig = input.casualTeamSize === undefined ? event.team_size_config : {
    ...event.team_size_config,
    casual: { ...currentCasual, minMembers: input.casualTeamSize, maxMembers: input.casualTeamSize },
  };
  return { name, locationLabel, startsAt, endsAt, mode: input.mode ?? event.mode, teamSizeConfig };
}

export async function updateSpogomiEvent(params: { supabase: SupabaseClient; event: EventRow; actorClerkId: string; input: SpogomiEventUpdateInput }) {
  const { event, input, supabase, actorClerkId } = params;
  const update = normalizeEventUpdate(event, input);
  const result = await supabase.rpc("spogomi_update_event_metadata", {
    p_event_id: event.id,
    p_expected_revision: Number(event.composition_revision ?? 0),
    p_actor_clerk_id: actorClerkId,
    p_name: update.name,
    p_location_label: update.locationLabel,
    p_starts_at: update.startsAt,
    p_ends_at: update.endsAt,
    p_mode: update.mode,
    p_team_size_config: update.teamSizeConfig,
    p_public_visibility: input.publicVisibility ?? event.public_visibility,
    p_public_results_visibility: input.publicResultsVisibility ?? event.public_results_visibility,
  });
  if (result.error) throw result.error;
  return result.data as EventRow;
}
