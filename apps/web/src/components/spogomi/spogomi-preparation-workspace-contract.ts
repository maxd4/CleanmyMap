import type { SpogomiDivisionType } from "@/lib/spogomi/types";
import type { SpogomiRegistrationReadiness } from "@/lib/spogomi/registration-readiness";
import type { SpogomiRouteProjection } from "@/lib/spogomi/route-types";

export type WorkspaceData = {
  event: {
    id: string;
    action_id: string;
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
    registration_status: "registered" | "withdrawn";
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
  route: SpogomiRouteProjection | null;
  routes: SpogomiRouteProjection[];
  categoryRules: Array<{
    id: string;
    event_id: string;
    division_id: string;
    regulation_version: string;
    code: string;
    label: string;
    measurement_kind: string;
    unit: string;
    coefficient: number | string | null;
    coefficient_status: "unknown" | "confirmed" | "not_applicable";
    environmental_category_slug: string | null;
    display_order: number;
    is_complete: boolean;
  }>;
  environmentMappings: Array<{
    id: string;
    event_id: string;
    division_id: string;
    mapping_version: string;
    category_rule_id: string;
    category_code: string;
    environmental_category_slug: string | null;
    source_field: "mass_grams" | "object_count" | "quantity" | null;
    source_unit: string;
    target_unit: "grams" | "count" | "quantity" | null;
    unit_factor_to_target: number | string | null;
    counts_toward_total: boolean;
    is_megots: boolean;
    mapping_status: "mapped" | "excluded" | "unmapped";
    exclusion_reason: string | null;
  }>;
  eventAccess: Array<{ role: string; revoked_at: string | null }>;
  registrationReadiness?: SpogomiRegistrationReadiness;
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
