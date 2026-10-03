import type {
  ActionGeometrySource,
  ActionPhase,
  ActionPreparationData,
} from "@/lib/actions/types";
import type { CommunityEventLocationSource } from "@/lib/community/event-location";
import type { OrganizerType } from "@/lib/actions/organizer-type";

/**
 * Raw Row Types from Supabase (matching database schema)
 */

export type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  title: string;
  event_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  location_source: CommunityEventLocationSource | null;
  description: string | null;
};
export type ActionParticipantRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  action_id: string;
  user_id: string;
  joined_at: string;
  participation_status: "pending" | "confirmed" | "cancelled";
  participation_source:
    | "group_form"
    | "manual_add"
    | "admin"
    | "admin_override"
    | "import"
    | "action_creator"
    | "action_organizer"
    | "post_action_claim";
  individual_waste_kg?: number | null;
  individual_waste_condition?: "sec" | "humide" | "mouille" | null;
  individual_waste_measurement_method?: string | null;
  individual_waste_normalization_version?: string | null;
  individual_cigarette_butts_count?: number | null;
  individual_cigarette_butts_mass_kg?: number | null;
  individual_cigarette_butts_condition?: "propre" | "humide" | "mouille" | null;
  individual_cigarette_butts_provenance?: "counted" | "measured" | "derived" | null;
  individual_cigarette_butts_conversion_version?: string | null;
  individual_impact_measured_by?: string | null;
  individual_impact_measured_at?: string | null;
};

export type ActionRegistrationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  action_id: string;
  user_id: string;
  registered_at: string;
  registration_status: "pending" | "confirmed" | "cancelled";
  registration_source:
    | "group_form"
    | "manual_add"
    | "admin"
    | "admin_override"
    | "import";
};

export type ActionRow = {
  id: string;
  created_at: string;
  updated_at?: string;
  created_by_clerk_id: string;
  actor_name: string | null;
  organizer_type?: OrganizerType | null;
  organizer_id?: string | null;
  organizer_name?: string | null;
  action_date: string;
  location_label: string;
  department_code?: string | null;
  department_name?: string | null;
  latitude: number | null;
  longitude: number | null;
  derived_geometry_kind: "point" | "polyline" | "polygon" | "multiline" | null;
  derived_geometry_geojson: string | null;
  geometry_confidence: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number;
  duration_minutes: number;
  event_start_time?: string | null;
  event_end_time?: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  cancelled_at?: string | null;
  cancelled_by_clerk_id?: string | null;
  cancellation_reason?:
    | "weather"
    | "organizer_unavailable"
    | "authorization_logistics"
    | "insufficient_participants"
    | "moved"
    | "other"
    | null;
  cancelled_from_status?: "pending" | "approved" | null;
  published_at?: string | null;
  moderation_visibility?: "visible" | "hidden";
  hidden_at?: string | null;
  hidden_by_clerk_id?: string | null;
  hidden_reason?: string | null;
  action_phase: ActionPhase;
  preparation_data: ActionPreparationData;
  geometry_source?: ActionGeometrySource | null;
};
