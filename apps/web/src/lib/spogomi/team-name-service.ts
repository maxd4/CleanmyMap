import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSpogomiTeamPublicName } from "./team-name";

type TeamNameRpcError = { code?: string; message?: string };

function teamNameRpcError(error: TeamNameRpcError): Error {
  if (error.code === "40001") {
    return new Error("Conflict: le pseudonyme de cette équipe a changé entre-temps. Rechargez la page puis réessayez.");
  }
  if (error.code === "23505" || /already used|déjà utilisé|duplicate/i.test(error.message ?? "")) {
    return new Error("Conflict: ce pseudonyme est déjà utilisé dans cet événement.");
  }
  if (error.code === "23514" || /validation|invalid|obligatoire|60 caractères|caractère de contrôle/i.test(error.message ?? "")) {
    return new Error(`Validation: ${error.message ?? "le pseudonyme de l’équipe est invalide."}`);
  }
  return new Error(error.message ?? "Le pseudonyme de l’équipe n’a pas pu être enregistré.");
}

export async function renameSpogomiTeam(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
  expectedPublicName: string;
  publicName: string;
  actorClerkId: string;
}) {
  const publicName = normalizeSpogomiTeamPublicName(params.publicName);
  const result = await params.supabase.rpc("spogomi_rename_team_public_name", {
    p_event_id: params.eventId,
    p_team_id: params.teamId,
    p_expected_public_name: params.expectedPublicName,
    p_public_name: publicName,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw teamNameRpcError(result.error);
  return result.data;
}
