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

export type ActionDrawingKind = "polyline" | "polygon";

export type ActionDrawing = {
  kind: ActionDrawingKind;
  coordinates: [number, number][];
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
  manualDrawing?: ActionDrawing;
};

export type ActionMapItem = Pick<
  ActionListItem,
  "id" | "action_date" | "location_label" | "latitude" | "longitude" | "waste_kg" | "cigarette_butts" | "status"
> & {
  record_type?: "action" | "clean_place" | "spot" | "other";
  source?: string;
  manual_drawing?: ActionDrawing | null;
  manual_drawing_geojson?: string | null;
  contract?: {
    id: string;
    type: "action" | "clean_place" | "spot";
    status: ActionStatus;
    source: string;
    location: {
      label: string;
      latitude: number | null;
      longitude: number | null;
    };
    geometry: {
      kind: "point" | "polyline" | "polygon";
      coordinates: [number, number][];
      geojson: string | null;
    };
    dates: {
      observedAt: string;
      createdAt: string | null;
      importedAt: string | null;
      validatedAt: string | null;
    };
    metadata: {
      actorName: string | null;
      notes: string | null;
      notesPlain: string | null;
      wasteKg: number;
      cigaretteButts: number;
      volunteersCount: number;
      durationMinutes: number;
      manualDrawing: ActionDrawing | null;
    };
  };
};

export type ActionMapResponse = {
  status: "ok";
  count: number;
  daysWindow: number;
  items: ActionMapItem[];
};
