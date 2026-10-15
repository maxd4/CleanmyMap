import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRow } from "./preparation-service";

export const SPOGOMI_ORGANIZER_EVENT_SELECT =
  "id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision";

function actionIdentity(identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>): ActionPermissionIdentity {
  return { userId: identity?.userId ?? "", role: identity?.role ?? null, activeRole: identity?.activeRole ?? null };
}

export function canManageEvent(identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>, event: Pick<EventRow, "created_by_clerk_id">, organizerIds: string[]): boolean {
  return canManageAction(actionIdentity(identity), { createdByClerkId: event.created_by_clerk_id }, organizerIds);
}

export async function loadSpogomiEventForOrganizer(supabase: SupabaseClient, eventId: string, userId: string) {
  return loadOrganizerEventByFilter(supabase, "id", eventId, userId);
}

export async function loadSpogomiEventBySlugForOrganizer(supabase: SupabaseClient, slug: string, userId: string) {
  return loadOrganizerEventByFilter(supabase, "event_slug", slug, userId);
}

export async function loadSpogomiEventBySlugForCurrentOrganizer(slug: string, userId: string) {
  return loadSpogomiEventBySlugForOrganizer(getSupabaseServerClient(true), slug, userId);
}

async function loadOrganizerEventByFilter(supabase: SupabaseClient, column: "id" | "event_slug", value: string, userId: string) {
  const result = await supabase.from("spogomi_events").select(SPOGOMI_ORGANIZER_EVENT_SELECT).eq(column, value).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const event = result.data as EventRow;
  const identity = await getCurrentUserIdentity({ userId });
  if (!identity || identity.userId !== userId) return false;
  const organizers = await supabase.from("action_organizers").select("organizer_clerk_id").eq("action_id", event.action_id);
  if (organizers.error) throw organizers.error;
  if (!canManageEvent(identity, event, (organizers.data ?? []).map((row) => String(row.organizer_clerk_id)))) return false;
  return event;
}
