export const ACTION_STATUSES = ["pending", "approved", "rejected"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionRecordType = "action" | "clean_place" | "spot";
export type LegacyActionRecordType = "action" | "clean_place" | "other";
export type ActionGeometryKind = "point" | "polyline" | "polygon";
export type ActionGeometryOrigin =
  | "manual"
  | "reference"
  | "routed"
  | "estimated_area"
  | "fallback_point";
export type ActionGeometrySource = ActionGeometryOrigin;
export type ActionSubmissionMode = "quick" | "complete";
export type ActionQualityGrade = "A" | "B" | "C";
export type ActionImpactLevel = "faible" | "moyen" | "fort" | "critique";
export type ActionVisionSource = "heuristic" | "hybrid" | "vision";
export type ActionVisionDensity = "sec" | "humide_dense" | "mouille";

export type ActionPhotoAsset = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  dataUrl: string;
};

export type ActionVisionConfidence<T> = {
  value: T;
  confidence: number;
  interval?: [number, number] | null;
};

export type ActionVisionEstimate = {
  modelVersion: string;
  source: ActionVisionSource;
  provisional: boolean;
  bagsCount: ActionVisionConfidence<number>;
  fillLevel: ActionVisionConfidence<number>;
  density: ActionVisionConfidence<ActionVisionDensity>;
  wasteKg: ActionVisionConfidence<number>;
};

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

export type ActionContractCreatePayload = {
  type: ActionRecordType;
  source: string;
  actor_name: string | null;
  association_name?: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  departure_location_label?: string | null;
  arrival_location_label?: string | null;
  route_style?: "direct" | "souple" | null;
  route_adjustment_message?: string | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number;
  duration_minutes: number;
  notes: string | null;
  manual_drawing?: ActionDrawing | null;
  waste_breakdown?: ActionWasteBreakdown | null;
  photos?: ActionPhotoAsset[] | null;
  vision_estimate?: ActionVisionEstimate | null;
};

export type ActionListItem = {
  id: string;
  created_at: string;
  created_by_clerk_id?: string | null;
  actor_name: string | null;
  association_name?: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number;
  duration_minutes: number;
  notes: string | null;
  status: ActionStatus;
  record_type?: LegacyActionRecordType;
  source?: string;
  notes_plain?: string | null;
  observed_at?: string;
  geometry_kind?: ActionGeometryKind | null;
  geometry_geojson?: string | null;
  geometry_confidence?: number | null;
  geometry_source?: ActionGeometrySource | null;
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
      kind: ActionGeometryKind;
      coordinates: [number, number][];
      geojson: string | null;
      confidence: number | null;
      geometrySource: ActionGeometrySource;
      origin: ActionGeometryOrigin;
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
      wasteKg: number | null;
      cigaretteButts: number | null;
      volunteersCount: number;
      durationMinutes: number;
      manualDrawing: ActionDrawing | null;
      placeType?: string | null;
      departureLocationLabel?: string | null;
      arrivalLocationLabel?: string | null;
      routeStyle?: "direct" | "souple" | null;
      routeAdjustmentMessage?: string | null;
      photos?: ActionPhotoAsset[] | null;
      visionEstimate?: ActionVisionEstimate | null;
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
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
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
  recordType?: ActionRecordType;
  photos?: ActionPhotoAsset[];
  visionEstimate?: ActionVisionEstimate | null;
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
  | "created_by_clerk_id"
> & {
  record_type?: ActionRecordType | LegacyActionRecordType;
  source?: string;
  geometry_kind?: ActionGeometryKind | null;
  geometry_geojson?: string | null;
  geometry_confidence?: number | null;
  geometry_source?: ActionGeometrySource | null;
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
      kind: ActionGeometryKind;
      coordinates: [number, number][];
      geojson: string | null;
      confidence: number | null;
      geometrySource: ActionGeometrySource;
      origin: ActionGeometryOrigin;
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
      departureLocationLabel?: string | null;
      arrivalLocationLabel?: string | null;
      notes: string | null;
      notesPlain: string | null;
      wasteKg: number | null;
      cigaretteButts: number | null;
      volunteersCount: number;
      durationMinutes: number;
      manualDrawing: ActionDrawing | null;
      placeType?: string | null;
      photos?: ActionPhotoAsset[] | null;
      visionEstimate?: ActionVisionEstimate | null;
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
