import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageEvent, loadSpogomiEventForOrganizer } from "./preparation-event-access";

export type SpogomiFieldOperationsCapability =
  | "timing"
  | "arrival"
  | "weighing"
  | "measurement_entry"
  | "arbitration"
  | "certification";

export type SpogomiFieldOperationsAccess = {
  event: {
    id: string;
    action_id: string;
    created_by_clerk_id: string;
    name: string;
    event_slug: string | null;
    mode: string;
    state: string;
    starts_at: string;
    ends_at: string | null;
    official_timezone: string;
    public_visibility: string;
    public_results_visibility: string;
  };
  userId: string;
  isOrganizer: boolean;
  roles: string[];
  capabilities: ReadonlySet<SpogomiFieldOperationsCapability>;
};

const EVENT_SELECT = "id, action_id, created_by_clerk_id, name, event_slug, mode, state, starts_at, ends_at, official_timezone, public_visibility, public_results_visibility";
const OPERATIONAL_ROLES = ["timekeeper", "weigher", "data_entry", "arbiter", "certifier"] as const;

export function spogomiFieldCapabilitiesForRoles(roles: string[], isOrganizer: boolean): Set<SpogomiFieldOperationsCapability> {
  const capabilities = new Set<SpogomiFieldOperationsCapability>();
  if (isOrganizer || roles.includes("timekeeper")) {
    capabilities.add("timing");
    capabilities.add("arrival");
  }
  if (isOrganizer || roles.includes("weigher")) capabilities.add("weighing");
  if (isOrganizer || roles.includes("data_entry")) capabilities.add("measurement_entry");
  if (isOrganizer || roles.includes("arbiter") || roles.includes("referee")) capabilities.add("arbitration");
  if (isOrganizer || roles.includes("certifier")) capabilities.add("certification");
  return capabilities;
}
export async function loadSpogomiFieldOperationsAccess(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
}): Promise<SpogomiFieldOperationsAccess | null> {
  const identity = await getCurrentUserIdentity({ userId: params.userId });
  if (!identity || identity.userId !== params.userId) return null;
  const eventResult = await params.supabase.from("spogomi_events").select(EVENT_SELECT).eq("id", params.eventId).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;
  const [organizersResult, reviewersResult] = await Promise.all([
    params.supabase.from("action_organizers").select("organizer_clerk_id").eq("action_id", eventResult.data.action_id),
    params.supabase.from("spogomi_event_reviewers").select("role").eq("event_id", params.eventId).eq("clerk_id", params.userId).is("revoked_at", null),
  ]);
  if (organizersResult.error) throw organizersResult.error;
  if (reviewersResult.error) throw reviewersResult.error;
  const organizerIds = (organizersResult.data ?? []).map((row) => String(row.organizer_clerk_id));
  const isOrganizer = canManageEvent(identity, eventResult.data, organizerIds);
  const roles = (reviewersResult.data ?? []).map((row) => String(row.role));
  const capabilities = spogomiFieldCapabilitiesForRoles(roles, isOrganizer);
  if (!isOrganizer && !roles.some((role) => OPERATIONAL_ROLES.includes(role as typeof OPERATIONAL_ROLES[number]) || role === "referee")) return null;
  return { event: eventResult.data, userId: params.userId, isOrganizer, roles, capabilities };
}

export function assertSpogomiFieldCapability(access: SpogomiFieldOperationsAccess | null, capability: SpogomiFieldOperationsCapability): asserts access is SpogomiFieldOperationsAccess {
  if (!access || !access.capabilities.has(capability)) throw new Error("SPOGOMI field operation is forbidden.");
}

export async function setSpogomiOperationalAccess(params: {
  supabase: SupabaseClient;
  eventId: string;
  clerkId: string;
  role: Extract<(typeof OPERATIONAL_ROLES)[number], string>;
  operation: "grant" | "revoke";
  actorClerkId: string;
}): Promise<unknown> {
  const event = await loadSpogomiEventForOrganizer(params.supabase, params.eventId, params.actorClerkId);
  if (event === null) throw new Error("SPOGOMI event not found.");
  if (event === false) throw new Error("SPOGOMI operational access assignment is forbidden.");
  const result = await params.supabase.rpc("spogomi_set_operational_access", {
    p_event_id: params.eventId,
    p_subject_clerk_id: params.clerkId.trim(),
    p_access_role: params.role,
    p_operation: params.operation,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw result.error;
  return result.data;
}
export async function loadSpogomiFieldOperationsDashboard(params: { supabase: SupabaseClient; eventId: string; divisionId?: string | null }): Promise<{
  operations: unknown[];
  returns: unknown[];
  incidents: unknown[];
  measurements: unknown[];
  divisions: unknown[];
  teams: unknown[];
  categories: unknown[];
}> {
  const divisionId = params.divisionId;
  const teamsQuery = divisionId ? params.supabase.from("spogomi_teams").select("id, division_id, team_number, public_name, composition_state").eq("event_id", params.eventId).eq("division_id", divisionId) : params.supabase.from("spogomi_teams").select("id, division_id, team_number, public_name, composition_state").eq("event_id", params.eventId);
  const categoriesQuery = divisionId ? params.supabase.from("spogomi_category_rules").select("id, division_id, code, label, measurement_kind, unit, is_complete").eq("event_id", params.eventId).eq("division_id", divisionId) : params.supabase.from("spogomi_category_rules").select("id, division_id, code, label, measurement_kind, unit, is_complete").eq("event_id", params.eventId);
  const operationsQuery = divisionId ? params.supabase.from("spogomi_field_operations").select("*").eq("event_id", params.eventId).eq("division_id", divisionId) : params.supabase.from("spogomi_field_operations").select("*").eq("event_id", params.eventId);
  const returnsQuery = divisionId ? params.supabase.from("spogomi_team_returns").select("id, division_id, team_id, actual_return_at, return_status, note, recorded_by_clerk_id, version, updated_at").eq("event_id", params.eventId).eq("division_id", divisionId) : params.supabase.from("spogomi_team_returns").select("id, division_id, team_id, actual_return_at, return_status, note, recorded_by_clerk_id, version, updated_at").eq("event_id", params.eventId);
  const incidentsQuery = divisionId ? params.supabase.from("spogomi_field_incidents").select("id, division_id, team_id, category, observed_at, location, raw_observation, decision_status, decision_kind, decision_points, rule_reference, justification, observed_by_clerk_id, decided_by_clerk_id, decided_at, created_at").eq("event_id", params.eventId).eq("division_id", divisionId) : params.supabase.from("spogomi_field_incidents").select("id, division_id, team_id, category, observed_at, location, raw_observation, decision_status, decision_kind, decision_points, rule_reference, justification, observed_by_clerk_id, decided_by_clerk_id, decided_at, created_at").eq("event_id", params.eventId);
  const measurementsQuery = divisionId ? params.supabase.from("spogomi_operational_measurements").select("id, division_id, team_id, category_rule_id, revision, status, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, source_kind, source_reference, entered_by_clerk_id, certified_by_clerk_id, certified_at, rejection_reason, updated_at").eq("event_id", params.eventId).eq("division_id", divisionId).neq("status", "superseded") : params.supabase.from("spogomi_operational_measurements").select("id, division_id, team_id, category_rule_id, revision, status, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, source_kind, source_reference, entered_by_clerk_id, certified_by_clerk_id, certified_at, rejection_reason, updated_at").eq("event_id", params.eventId).neq("status", "superseded");
  const [divisions, teams, categories, operations, returns, incidents, measurements] = await Promise.all([
    params.supabase.from("spogomi_divisions").select("id, division_type, division_key, regulation_version, regulation_status").eq("event_id", params.eventId).order("division_type"),
    teamsQuery.order("team_number"),
    categoriesQuery.order("display_order"),
    operationsQuery.order("division_id"),
    returnsQuery.order("actual_return_at", { ascending: false }),
    incidentsQuery.order("observed_at", { ascending: false }),
    measurementsQuery.order("updated_at", { ascending: false }),
  ]);
  for (const result of [divisions, teams, categories, operations, returns, incidents, measurements]) if (result.error) throw result.error;
  return { divisions: divisions.data ?? [], teams: teams.data ?? [], categories: categories.data ?? [], operations: operations.data ?? [], returns: returns.data ?? [], incidents: incidents.data ?? [], measurements: measurements.data ?? [] };
}

export async function callSpogomiFieldOperation(params: { supabase: SupabaseClient; rpc: string; args: Record<string, unknown> }): Promise<unknown> {
  const result = await params.supabase.rpc(params.rpc, params.args);
  if (result.error) throw result.error;
  return result.data;
}
// End of server-only field-operation primitives.
