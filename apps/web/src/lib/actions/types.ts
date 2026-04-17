export const ACTION_STATUSES = ["pending", "approved", "rejected"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionRecordType = "action" | "clean_place" | "spot";
export type LegacyActionRecordType = "action" | "clean_place" | "other";
export type ActionSubmissionMode = "quick" | "complete";
export type ActionQualityGrade = "A" | "B" | "C";
export type ActionImpactLevel = "faible" | "moyen" | "fort" | "critique";

export type ActionMegotsCondition = "propre" | "humide" | "mouille";

export type ActionWasteBreakdown = {
  megotsKg?: number;
  megotsCondition?: ActionMegotsCondition;
  plastiqueKg?: number;
  verreKg?: number;
  metalKg?: number;
  mixteKg?: number;
  triQuality?: "faible" | "moyenne" | "elevee";
};

export type ActionQualityBreakdown = {
  completeness: number;
  coherence: number;
  geoloc: number;
  traceability: number;
  freshness: number;
};

export type ActionListItem = {
  id: string;
  created_at: string;
  actor_name: string | null;
  association_name?: string | null;
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
  record_type?: LegacyActionRecordType;
  source?: string;
  notes_plain?: string | null;
  observed_at?: string;
  geometry_kind?: "point" | "polyline" | "polygon" | null;
  geometry_geojson?: string | null;
  manual_drawing?: ActionDrawing | null;
  manual_drawing_geojson?: string | null;
  submission_mode?: ActionSubmissionMode | null;
  quality_score?: number;
  quality_grade?: ActionQualityGrade;
  quality_flags?: string[];
  quality_breakdown?: ActionQualityBreakdown;
  to_fix_priority?: boolean;
  impact_level?: ActionImpactLevel;
  waste_breakdown?: ActionWasteBreakdown | null;
  contract?: {
    id: string;
    type: ActionRecordType;
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
      associationName?: string | null;
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

export type ActionListResponse = {
  status: "ok";
  count: number;
  items: ActionListItem[];
  partialSource?: boolean;
  sourceHealth?: {
    partial: boolean;
    failedSources: Array<"actions" | "spots" | "local">;
    availableSources: Array<"actions" | "spots" | "local">;
    warnings: string[];
  };
};

export type ActionDrawingKind = "polyline" | "polygon";

export type ActionDrawing = {
  kind: ActionDrawingKind;
  coordinates: [number, number][];
};

export type CreateActionPayload = {
  actorName?: string;
  associationName?: string;
  actionDate: string;
  locationLabel: string;
  latitude?: number;
  longitude?: number;
  wasteKg: number;
  cigaretteButts: number; // Toujours présent pour la compatibilité, calculé côté client ou API
  volunteersCount: number;
  durationMinutes: number;
  notes?: string;
  placeType?: string;
  manualDrawing?: ActionDrawing;
  submissionMode?: ActionSubmissionMode;
  wasteBreakdown?: ActionWasteBreakdown;
};

export type ActionMapItem = Pick<
  ActionListItem,
  | "id"
  | "action_date"
  | "location_label"
  | "latitude"
  | "longitude"
  | "waste_kg"
  | "cigarette_butts"
  | "status"
> & {
  record_type?: ActionRecordType | LegacyActionRecordType;
  source?: string;
  manual_drawing?: ActionDrawing | null;
  manual_drawing_geojson?: string | null;
  submission_mode?: ActionSubmissionMode | null;
  quality_score?: number;
  quality_grade?: ActionQualityGrade;
  quality_flags?: string[];
  quality_breakdown?: ActionQualityBreakdown;
  to_fix_priority?: boolean;
  impact_level?: ActionImpactLevel;
  waste_breakdown?: ActionWasteBreakdown | null;
  contract?: {
    id: string;
    type: ActionRecordType;
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
      associationName?: string | null;
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
  partialSource?: boolean;
  sourceHealth?: {
    partial: boolean;
    failedSources: Array<"actions" | "spots" | "local">;
    availableSources: Array<"actions" | "spots" | "local">;
    warnings: string[];
  };
};
