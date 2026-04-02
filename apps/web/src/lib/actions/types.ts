export const ACTION_STATUSES = ["pending", "approved", "rejected"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

export type ActionListItem = {
  id: string;
  created_at: string;
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
  status: ActionStatus;
};

export type ActionListResponse = {
  status: "ok";
  count: number;
  items: ActionListItem[];
};

export type CreateActionPayload = {
  actorName?: string;
  actionDate: string;
  locationLabel: string;
  latitude?: number;
  longitude?: number;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  notes?: string;
};

export type ActionMapItem = Pick<
  ActionListItem,
  "id" | "action_date" | "location_label" | "latitude" | "longitude" | "waste_kg" | "cigarette_butts" | "status"
>;

export type ActionMapResponse = {
  status: "ok";
  count: number;
  daysWindow: number;
  items: ActionMapItem[];
};
