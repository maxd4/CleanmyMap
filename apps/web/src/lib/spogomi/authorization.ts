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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEventAccessRow(value: unknown): SpogomiEventAccessDecision["event"] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.action_id !== "string" ||
    typeof value.created_by_clerk_id !== "string" || typeof value.name !== "string" ||
    (value.event_slug !== null && typeof value.event_slug !== "string") ||
    (value.mode !== "casual" && value.mode !== "world_cup" && value.mode !== "mixed") || typeof value.state !== "string" ||
    typeof value.starts_at !== "string" || (value.ends_at !== null && typeof value.ends_at !== "string") ||
    typeof value.official_timezone !== "string" ||
    (value.public_visibility !== "private" && value.public_visibility !== "published") ||
    (value.public_results_visibility !== "hidden" && value.public_results_visibility !== "provisional" && value.public_results_visibility !== "certified")) {
    return null;
  }
  return {
    id: value.id,
    action_id: value.action_id,
    created_by_clerk_id: value.created_by_clerk_id,
    name: value.name,
    event_slug: value.event_slug,
    mode: value.mode,
    state: value.state,
    starts_at: value.starts_at,
    ends_at: value.ends_at,
    official_timezone: value.official_timezone,
    public_visibility: value.public_visibility,
    public_results_visibility: value.public_results_visibility,
  };
}

export function hasSpogomiCapability(
  access: Pick<SpogomiEventAccessDecision, "capabilities"> | null | undefined,
  capability: SpogomiCapability,
): boolean {
  return Boolean(access?.capabilities.has(capability));
}

async function loadSpogomiAccessRelations(params: { supabase: SupabaseClient; eventId: string; userId: string; actionId: string }) {
  const [organizersResult, reviewersResult, participantResult] = await Promise.all([
    params.supabase.from("action_organizers").select("organizer_clerk_id").eq("action_id", params.actionId),
    params.supabase.from("spogomi_event_reviewers").select("role").eq("event_id", params.eventId).eq("clerk_id", params.userId).is("revoked_at", null),
    params.supabase.from("spogomi_participants").select("id").eq("event_id", params.eventId).eq("clerk_id", params.userId).eq("account_link_status", "verified").maybeSingle(),
  ]);
  for (const result of [organizersResult, reviewersResult, participantResult]) if (result.error) throw result.error;
  return { organizersResult, reviewersResult, participantResult };
}

function buildSpogomiCapabilities(isOrganizer: boolean, reviewerRoles: SpogomiAssignedAccessRole[], participantId: string | null): Set<SpogomiCapability> {
  const capabilities = new Set<SpogomiCapability>();
  if (participantId) capabilities.add("private_read");
  if (isOrganizer || reviewerRoles.includes("observer") || reviewerRoles.includes("referee")) capabilities.add("observe");
  if (isOrganizer || reviewerRoles.includes("referee")) capabilities.add("arbitrate");
  if (isOrganizer || reviewerRoles.includes("checkin")) capabilities.add("checkin");
  if (isOrganizer) {
    capabilities.add("manage");
    capabilities.add("assign_event_access");
  }
  return capabilities;
}

function resolveSpogomiRole(isOrganizer: boolean, reviewerRoles: SpogomiAssignedAccessRole[], participantId: string | null): SpogomiEventAccessRole | null {
  if (isOrganizer) return "organizer";
  if (reviewerRoles.includes("referee")) return "referee";
  if (reviewerRoles.includes("checkin")) return "checkin";
  if (reviewerRoles.includes("observer")) return "observer";
  return participantId ? "participant" : null;
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

  const event = parseEventAccessRow(eventResult.data);
  if (!event) throw new Error("La réponse d’accès à l’événement SPOGOMI est invalide.");
  const { organizersResult, reviewersResult, participantResult } = await loadSpogomiAccessRelations({ ...params, actionId: event.action_id });
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
  const capabilities = buildSpogomiCapabilities(isOrganizer, reviewerRoles, participantId);
  const role = resolveSpogomiRole(isOrganizer, reviewerRoles, participantId);

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
