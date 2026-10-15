import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageEvent } from "./preparation-event-access";
import type { EventRow } from "./preparation-service";

export type SpogomiCapability =
  | "private_read"
  | "observe"
  | "arbitrate"
  | "manage"
  | "assign_event_access"
  | "checkin";

export type SpogomiEventAccessRole = "organizer" | "referee" | "observer" | "checkin" | "participant";
type SpogomiAssignedAccessRole = Exclude<SpogomiEventAccessRole, "organizer" | "participant">;

export type SpogomiEventAccessDecision = {
  event: Pick<EventRow, "id" | "action_id" | "created_by_clerk_id" | "name" | "event_slug" | "mode" | "state" | "starts_at" | "ends_at" | "official_timezone" | "public_visibility" | "public_results_visibility">;
  userId: string;
  role: SpogomiEventAccessRole | null;
  isOrganizer: boolean;
  reviewerRoles: SpogomiAssignedAccessRole[];
  participantId: string | null;
  capabilities: ReadonlySet<SpogomiCapability>;
};

const EVENT_ACCESS_SELECT =
  "id, action_id, created_by_clerk_id, name, event_slug, mode, state, starts_at, ends_at, official_timezone, public_visibility, public_results_visibility";

export function hasSpogomiCapability(
  access: Pick<SpogomiEventAccessDecision, "capabilities"> | null | undefined,
  capability: SpogomiCapability,
): boolean {
  return Boolean(access?.capabilities.has(capability));
}

export async function resolveSpogomiEventAccess(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiEventAccessDecision | null> {
  const eventResult = await params.supabase
    .from("spogomi_events")
    .select(EVENT_ACCESS_SELECT)
    .eq("id", params.eventId)
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;

  const identity = await getCurrentUserIdentity({ userId: params.userId });
  if (!identity || identity.userId !== params.userId) return null;

  const [organizersResult, reviewersResult, participantResult] = await Promise.all([
    params.supabase
      .from("action_organizers")
      .select("organizer_clerk_id")
      .eq("action_id", eventResult.data.action_id),
    params.supabase
      .from("spogomi_event_reviewers")
      .select("role")
      .eq("event_id", params.eventId)
      .eq("clerk_id", params.userId)
      .is("revoked_at", null),
    params.supabase
      .from("spogomi_participants")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("clerk_id", params.userId)
      .eq("account_link_status", "verified")
      .maybeSingle(),
  ]);
  for (const result of [organizersResult, reviewersResult, participantResult]) {
    if (result.error) throw result.error;
  }

  const event = eventResult.data as SpogomiEventAccessDecision["event"];
  const organizerIds = (organizersResult.data ?? []).map((row) => String(row.organizer_clerk_id));
  const reviewerRoles = (reviewersResult.data ?? [])
    .map((row) => String(row.role))
    .filter((role): role is SpogomiAssignedAccessRole => role === "observer" || role === "referee" || role === "checkin");
  const isOrganizer = canManageEvent(
    identity,
    event,
    organizerIds,
  );
  const participantId = participantResult.data?.id ? String(participantResult.data.id) : null;
  const capabilities = new Set<SpogomiCapability>();

  if (participantId) capabilities.add("private_read");
  if (isOrganizer || reviewerRoles.includes("observer") || reviewerRoles.includes("referee")) capabilities.add("observe");
  if (isOrganizer || reviewerRoles.includes("referee")) capabilities.add("arbitrate");
  if (isOrganizer || reviewerRoles.includes("checkin")) capabilities.add("checkin");
  if (isOrganizer) {
    capabilities.add("manage");
    capabilities.add("assign_event_access");
  }

  const role = isOrganizer
    ? "organizer"
    : reviewerRoles.includes("referee")
      ? "referee"
      : reviewerRoles.includes("checkin")
        ? "checkin"
      : reviewerRoles.includes("observer")
        ? "observer"
        : participantId
          ? "participant"
          : null;

  return {
    event,
    userId: params.userId,
    role,
    isOrganizer,
    reviewerRoles,
    participantId,
    capabilities,
  };
}

export async function resolveSpogomiEventAccessBySlug(params: {
  supabase: SupabaseClient;
  eventSlug: string;
  userId: string;
}): Promise<SpogomiEventAccessDecision | null> {
  const eventResult = await params.supabase
    .from("spogomi_events")
    .select(EVENT_ACCESS_SELECT)
    .eq("event_slug", params.eventSlug)
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;

  return resolveSpogomiEventAccess({
    supabase: params.supabase,
    eventId: String(eventResult.data.id),
    userId: params.userId,
  });
}
