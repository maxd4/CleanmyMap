import type { ActionGeometryKind, ActionGeometrySource } from "@/lib/actions/types";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import type { ProgressionStatusPhase, ProgressionEventType } from "./gamification-contract-types";

export type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  type?: string | null;
  actor_name: string | null;
  organizer_type?: OrganizerType | null;
  organizer_id?: string | null;
  organizer_name?: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  waste_breakdown?: import("@/lib/actions/types").ActionWasteBreakdown | null;
  cigarette_butts: number;
  volunteers_count: number | null;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  action_phase?: import("@/lib/actions/types").ActionPhase | null;
  preparation_data?: import("@/lib/actions/types").ActionPreparationData | null;
  published_at?: string | null;
  derived_geometry_kind?: ActionGeometryKind | null;
  derived_geometry_geojson?: string | null;
  geometry_confidence?: number | null;
  geometry_source?: ActionGeometrySource | null;
};

/**
 * Minimal action projection needed to render the personal timeline.
 * It deliberately excludes organizer and preparation fields because this
 * projection is also used for actions recovered from validated role evidence.
 */
export type ActionTimelineRow = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "actor_name"
  | "action_date"
  | "location_label"
  | "latitude"
  | "longitude"
  | "waste_kg"
  | "cigarette_butts"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
  | "notes"
  | "derived_geometry_kind"
  | "derived_geometry_geojson"
  | "geometry_confidence"
  | "geometry_source"
>;

export type SpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  status: "new" | "validated" | "cleaned";
  label: string;
  notes: string | null;
};

export type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  description: string | null;
};

export type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
  updated_at: string;
};

export type EventInsertParams = {
  userId: string;
  eventType: ProgressionEventType;
  sourceTable: string;
  sourceId: string;
  statusPhase: ProgressionStatusPhase;
  weight: number;
  xpBase: number;
  xpAwarded: number;
  occurredOn: string;
  metadata?: Record<string, unknown>;
};
