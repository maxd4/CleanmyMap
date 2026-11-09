import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "./preparation-service";
import { parseSpogomiRegistrationReadiness, type SpogomiRegistrationPolicy, type SpogomiRegistrationReadiness } from "../registration-readiness";

export type SpogomiRegistrationPolicyPatch = Partial<Pick<SpogomiRegistrationPolicy, "capacity" | "safetyInstructions" | "safetyInstructionsVerified" | "organizationContact" | "organizationContactVerified" | "assistanceProcedure" | "assistanceProcedureVerified" | "minorsApplicable" | "minorInformation" | "minorInformationVerified">>;

function assertPolicyPatch(input: SpogomiRegistrationPolicyPatch): void {
  for (const key of ["safetyInstructions", "organizationContact", "assistanceProcedure", "minorInformation"] as const) {
    const value = input[key];
    if (value !== undefined && value !== null && typeof value !== "string") throw new Error("Validation: " + key + " doit être un texte.");
    if (typeof value === "string" && value.length > 4000) throw new Error("Validation: " + key + " est trop long.");
  }
  if (input.capacity !== undefined && input.capacity !== null && (!(typeof input.capacity === "number" || typeof input.capacity === "string") || !/^\d+$/.test(String(input.capacity)) || Number(input.capacity) < 1)) throw new Error("Validation: la capacité doit être un entier positif.");
  for (const key of ["safetyInstructionsVerified", "organizationContactVerified", "assistanceProcedureVerified", "minorsApplicable", "minorInformationVerified"] as const) if (input[key] !== undefined && typeof input[key] !== "boolean") throw new Error("Validation: " + key + " doit être booléen.");
}

export async function loadSpogomiRegistrationReadiness(params: { supabase: SupabaseClient; eventId: string }): Promise<SpogomiRegistrationReadiness> {
  const result = await params.supabase.rpc("spogomi_registration_readiness", { p_event_id: params.eventId });
  if (result.error) throw result.error;
  const readiness = parseSpogomiRegistrationReadiness(result.data);
  if (!readiness) throw new Error("La préparation des inscriptions SPOGOMI est invalide.");
  return readiness;
}

export async function updateSpogomiRegistrationPolicy(params: { supabase: SupabaseClient; event: EventRow; actorClerkId: string; patch: SpogomiRegistrationPolicyPatch }): Promise<EventRow> {
  assertPolicyPatch(params.patch);
  const result = await params.supabase.rpc("spogomi_update_registration_policy", {
    p_event_id: params.event.id,
    p_expected_revision: Number(params.event.composition_revision ?? 0),
    p_actor_clerk_id: params.actorClerkId,
    p_registration_policy: params.patch,
  });
  if (result.error) throw result.error;
  return result.data as EventRow;
}

export async function openSpogomiRegistration(params: { supabase: SupabaseClient; event: EventRow; actorClerkId: string }): Promise<EventRow> {
  const result = await params.supabase.rpc("spogomi_open_registration", {
    p_event_id: params.event.id,
    p_expected_revision: Number(params.event.composition_revision ?? 0),
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw result.error;
  return result.data as EventRow;
}
