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
  description: string | null;
};

export type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
  updated_at?: string;
};

export type SpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  label: string;
  waste_type: "clean_place" | "spot";
  latitude: number | null;
  longitude: number | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

export type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  actor_name: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number;
  cigarette_butts: number;
  volunteers_count: number;
  duration_minutes: number;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
};
