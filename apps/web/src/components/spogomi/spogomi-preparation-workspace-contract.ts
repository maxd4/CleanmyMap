import type { SpogomiDivisionType } from "@/lib/spogomi/types";

export type WorkspaceData = {
  event: {
    id: string;
    event_slug: string | null;
    public_visibility: "private" | "published";
    public_results_visibility: "hidden" | "provisional" | "certified";
    name: string;
    location_label: string;
    mode: "casual" | "world_cup" | "mixed";
    state: string;
    starts_at: string;
    ends_at: string | null;
    composition_revision?: number;
    team_size_config?: {
      casual?: { minMembers?: number | null; maxMembers?: number | null };
    };
  };
  divisions: Array<{
    id: string;
    event_id: string;
    division_type: SpogomiDivisionType;
    division_key: SpogomiDivisionType;
    regulation_version?: string;
    regulation_status?: "incomplete" | "complete";
    regulation_source_reference?: string | null;
    regulation_config?: { [key: string]: unknown };
    team_size_config?: {
      casual?: { minMembers?: number | null; maxMembers?: number | null };
    };
  }>;
  participants: Array<{
    id: string;
    division_id: string;
    display_name: string | null;
    external_reference: string | null;
    group_preference: string | null;
    team_id: string | null;
    attendance_status: "unknown" | "present" | "absent";
    account_link_status: "unlinked" | "pending" | "verified" | "rejected";
    source_system?: string | null;
    ticket_status?: string | null;
    ticket_deleted?: boolean;
    composition_eligible?: boolean;
  }>;
  teams: Array<{
    id: string;
    division_id: string;
    team_number: number;
    public_name: string;
    composition_state: string;
  }>;
  route: {
    file_name: string;
    reference_distance_km: number;
    geometry_geojson: { coordinates: [number, number][] };
  } | null;
  categoryRules: Array<{
    division_id: string;
    label: string;
    measurement_kind: string;
    unit: string;
    is_complete: boolean;
  }>;
  eventAccess: Array<{ role: string; revoked_at: string | null }>;
};

export type SpogomiPreparationWorkspaceSection =
  | "teams"
  | "attendance"
  | "results"
  | "arbitration"
  | "bilan"
  | "settings";

export const ROSTER_PAGE_SIZE = 50;
export const ROSTER_MAPPING_FIELDS = [
  ["ticketReference", "Référence billet"],
  ["orderReference", "Référence commande"],
  ["orderAlternativeReference", "Référence commande avancée"],
  ["ticketStatus", "Statut du billet"],
  ["ticketDeleted", "Supprimé"],
  ["name", "Nom / occupant"],
  ["participantLastName", "Nom participant"],
  ["participantFirstName", "Prénom participant"],
  ["group", "Groupe"],
  ["sourceRowId", "Identifiant de ligne"],
] as const;

export const SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE = "Équipe {team.team_number} — {team.public_name}";
export const SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE = "Une absence ou un remplacement nécessite une procédure d’arbitrage versionnée";
export const SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING = "Billet annulé ou supprimé : affectation bloquée";
export const SPOGOMI_TEAM_EDITOR_LABELS = { edit: "Modifier", save: "Enregistrer", cancel: "Annuler" } as const;
