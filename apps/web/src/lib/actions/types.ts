export const ACTION_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];

export type ActionMapViewportQuery = {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number | null;
};

export const ACTION_ENTITY_TYPES = ["action", "clean_place", "spot"] as const;
export type ActionSourceName = "actions" | "spots" | "local";

import type { ActionDataQualitySummary } from "./quality/data-quality-types";
import type { ActionQualityGrade } from "./quality/quality-rules";
import type { WasteCategorySlug } from "@/lib/waste/types";
import type {
  ActionWasteMeasurementMethod,
  CanonicalWasteBreakdown,
} from "@/lib/waste/measurement";
import type {
  ActionCigaretteButtsMeasurements,
  RawCigaretteButtsMeasurementInput,
} from "@/lib/waste/cigarette-butts";
import type { ActionVolunteerParticipation } from "./volunteer-participation";
import type { OrganizerType } from "./organizer-type";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type {
  OperationalRoute,
  LegacyOperationalRoute,
} from "@/lib/route/route-operational";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";
import type { AdministrativeRequirements } from "./administrative-requirements";
import type { RouteGeometryMode, RouteGeometryProvider } from "@/lib/route/route-contract";

export type ActionRecordType = (typeof ACTION_ENTITY_TYPES)[number];
export type LegacyActionRecordType = "action" | "clean_place" | "other";
export type ActionGeometryKind = "point" | "polyline" | "polygon";
export const ACTION_GEOMETRY_SOURCES = [
  "manual",
  "gpx_import",
  "reference",
  "routed",
  "estimated_route",
  "estimated_area",
  "fallback_point",
] as const;
export type ActionGeometryOrigin = (typeof ACTION_GEOMETRY_SOURCES)[number];
export type ActionGeometrySource = ActionGeometryOrigin;
export type ActionRouteTopology = "loop" | "point_to_point";
export type ActionLocationCoordinates = {
  latitude: number;
  longitude: number;
};
export type ActionGpxImportMetadata = {
  source: "gpx_import";
  observedDistanceKm: number;
  pointCount: number;
  inferredTopology: ActionRouteTopology;
  fileName?: string;
};
export type ActionSubmissionMode = "quick" | "complete";
export type ActionPhase =
  | "pre_action"
  | "post_action_draft"
  | "post_action_complete";
export type { ActionQualityGrade } from "./quality/quality-rules";
export type ActionImpactLevel = "faible" | "moyen" | "fort" | "critique";
export type ActionVisionSource = "heuristic" | "hybrid" | "vision";
export type ActionVisionDensity = "sec" | "humide_dense" | "mouille";

export type ActionPreparationData = {
  actionTitle?: string;
  shortDescription?: string;
  communeZoneLabel?: string;
  pointDeRendezVous?: string;
  zoneCiblePrevue?: string;
  actionDate?: string;
  meetingTime?: string;
  departureTime?: string;
  /** Legacy compatibility only; new forms keep action duration on the row. */
  estimatedDurationMinutes?: number;
  plannedObjective?: "repérage" | "nettoyage" | "collecte_mégots" | "action_mixte" | "sensibilisation" | "autre";
  placeType?: string;
  estimatedDifficulty?: "facile" | "moderee" | "soutenue";
  accessibility?: string;
  safetyInstructions?: string;
  recommendedMaterials?: string;
  participantMessage?: string;
  creatorRole?: "organisateur" | "benevole" | "association" | "etudiant" | "autre";
  preparationState?: "brouillon" | "pret_a_partager" | "action_en_cours" | "a_completer_apres_action";
  /** Dedicated administrative validation state; distinct from preparationState. */
  administrativeRequirements?: AdministrativeRequirements;
  logisticsNotes?: string;
  checklistBeforeDeparture?: string;
  volunteersExpected?: number;
  volunteerParticipation?: ActionVolunteerParticipation | null;
  groupJoinEnabled?: boolean;
  expectedWasteCategories?: WasteCategorySlug[];
  midRouteLocationLabel?: string;
  /** Canonical route topology; legacy payloads are normalized before persistence. */
  routeTopology?: ActionRouteTopology;
  /** Immutable route evidence captured before this action was created. */
  routeCalibrationContext?: RouteCalibrationContext;
  /** Mutable operational copy planned from the planner, kept separate from the snapshot. */
  operationalRoute?: OperationalRoute;
  /** @deprecated Read compatibility only; normalize to operationalRoute. */
  actualRoute?: LegacyOperationalRoute;
  /** User target only; never treated as the measured provider distance. */
  routeTargetDistanceKm?: number;
  /** Provenance of the target value; absent means legacy and therefore derived. */
  routeTargetDistanceSource?: "derived" | "manual";
  /** Version of the policy used for a derived target. */
  routeTargetDistancePolicyVersion?: string;
  /** Coordinates selected for route endpoints; avoids a second server geocode. */
  midRouteCoordinates?: ActionLocationCoordinates;
  arrivalCoordinates?: ActionLocationCoordinates;
  /** Measured length of the user-provided GPX trace, kept separate from the target. */
  routeObservedDistanceKm?: number;
  /** Canonical metadata for a validated user-provided GPX trace. */
  gpxImport?: ActionGpxImportMetadata;
  /** Measured or estimated result of the server-side route provider. */
  routeNetworkDistanceKm?: number;
  routeGeometryMode?: RouteGeometryMode;
  routeGeometryProvider?: RouteGeometryProvider;
};

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

export type ActionWasteBreakdown = CanonicalWasteBreakdown & {
  /** Legacy read compatibility only; new writes use the canonical fields. */
  megotsKg?: number;
  megotsCondition?: ActionMegotsCondition;
  /** Legacy read compatibility only; new writes use recyclablesKg. */
  plastiqueKg?: number;
  /** Legacy read compatibility only; use glassKg for new writes. */
  verreKg?: number;
  /** Legacy read compatibility only; use recyclablesKg for new writes. */
  metalKg?: number;
  /** Legacy read compatibility only; use householdWasteKg or otherWasteKg. */
  mixteKg?: number;
  triQuality?: "faible" | "moyenne" | "elevee";
};

export type { ActionWasteMeasurementMethod };

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
  created_by_clerk_id?: string | null;
  actor_name: string | null;
  association_name?: string | null;
  organizer_type?: OrganizerType | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  waste_pollution_score?: number | null;
  cigarette_butts_pollution_score?: number | null;
  post_action_pollution_score?: number | null;
  volunteers_count: number;
  duration_minutes: number;
  notes: string | null;
  status: ActionStatus;
  published_at?: string | null;
  record_type?: LegacyActionRecordType;
  source?: string;
  source_status?: string | null;
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
  waste_categories?: WasteCategorySlug[] | null;
  data_quality?: ActionDataQualitySummary;
  contract?: {
    id: string;
    type: ActionRecordType;
    status: ActionStatus;
    source: string;
    location: {
      label: string;
      latitude: number | null;
      longitude: number | null;
      departmentCode?: string | null;
      departmentName?: string | null;
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
      eventStartTime?: string | null;
      eventEndTime?: string | null;
    };
    metadata: {
      actorName: string | null;
      associationName?: string | null;
      organizerType?: OrganizerType | null;
      notes: string | null;
      notesPlain: string | null;
      groupJoinEnabled: boolean | null;
      actionPhase?: ActionPhase | null;
      preparationData?: ActionPreparationData | null;
      wasteKg: number | null;
      cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
      volunteerParticipation?: ActionVolunteerParticipation | null;
      cigaretteButtsKg?: number | null;
      cigaretteButts: number | null;
      postActionPollutionScore?: number | null;
      volunteersCount: number;
      durationMinutes: number;
      manualDrawing: ActionDrawing | null;
      wasteBreakdown?: ActionWasteBreakdown | null;
      wasteMeasurementMethod?: ActionWasteMeasurementMethod | null;
      placeType?: string | null;
      submissionMode?: ActionSubmissionMode | null;
      departureLocationLabel?: string | null;
      arrivalLocationLabel?: string | null;
      routeStyle?: "direct" | "souple" | null;
      routeTargetDistanceKm?: number;
      routeAdjustmentMessage?: string | null;
      photos?: ActionPhotoAsset[] | null;
      visionEstimate?: ActionVisionEstimate | null;
    };
    dataQuality?: ActionDataQualitySummary;
  };
};

export type ActionListResponse = {
  status: "ok";
  count: number;
  items: ActionListItem[];
  partialSource?: boolean;
  sourceHealth?: {
    partial: boolean;
    failedSources: ActionSourceName[];
    availableSources: ActionSourceName[];
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
  organizerType?: OrganizerType | null;
  organizerAccounts?: string[];
  participantAccounts?: string[];
  groupJoinEnabled?: boolean;
  actionPhase?: ActionPhase;
  preparationData?: ActionPreparationData | null;
  /** Canonical itinerary → action handoff; persisted inside preparationData. */
  routeCalibrationContext?: RouteCalibrationContext | null;
  /** Ephemeral HMAC proof; consumed by the server and never persisted. */
  plannerSnapshotProof?: RoutePlannerProof | null;
  actionDate: string;
  locationLabel: string;
  departmentCode?: string | null;
  departmentName?: string | null;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeTopology?: ActionRouteTopology;
  routeStyle?: "direct" | "souple";
  routeTargetDistanceKm?: number;
  routeAdjustmentMessage?: string;
  latitude?: number;
  longitude?: number;
  wasteKg: number | null;
  cigaretteButtsMeasurements?: RawCigaretteButtsMeasurementInput | null;
  volunteerParticipation?: ActionVolunteerParticipation | null;
  cigaretteButtsMassKg?: number | null;
  cigaretteButtsVolumeLiters?: number | null;
  cigaretteButtsCondition?: ActionMegotsCondition | null;
  cigaretteButtsKg?: number | null;
  cigaretteButts: number | null;
  cigaretteButtsCount?: number | null;
  volunteersCount: number;
  durationMinutes: number;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  notes?: string;
  placeType?: string;
  manualDrawing?: ActionDrawing;
  /** Provenance of the final geometry represented by manualDrawing. */
  geometrySource?: ActionGeometrySource | null;
  submissionMode?: ActionSubmissionMode;
  wasteBreakdown?: ActionWasteBreakdown;
  wasteMeasurementMethod?: ActionWasteMeasurementMethod | null;
  recordType?: ActionRecordType;
  photos?: ActionPhotoAsset[];
  visionEstimate?: ActionVisionEstimate | null;
  // Données utilisateur automatiques
  userMetadata?: {
    userId: string;
    handle?: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
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
  | "waste_pollution_score"
  | "cigarette_butts_pollution_score"
  | "post_action_pollution_score"
  | "status"
  | "created_by_clerk_id"
> & {
  source_status?: string | null;
  volunteers_count?: number | null;
  duration_minutes?: number | null;
  notes_plain?: string | null;
  record_type?: ActionRecordType | LegacyActionRecordType;
  source?: string;
  organizer_type?: OrganizerType | null;
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
  waste_categories?: WasteCategorySlug[] | null;
  data_quality?: ActionDataQualitySummary;
  contract?: {
    id: string;
    type: ActionRecordType;
    status: ActionStatus;
    source: string;
    location: {
      label: string;
      latitude: number | null;
      longitude: number | null;
      departmentCode?: string | null;
      departmentName?: string | null;
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
      eventStartTime?: string | null;
      eventEndTime?: string | null;
    };
    metadata: {
      actorName: string | null;
      associationName?: string | null;
      organizerType?: OrganizerType | null;
      departureLocationLabel?: string | null;
      arrivalLocationLabel?: string | null;
      notes: string | null;
      notesPlain: string | null;
      groupJoinEnabled: boolean | null;
      actionPhase?: ActionPhase | null;
      preparationData?: ActionPreparationData | null;
      wasteKg: number | null;
      cigaretteButts: number | null;
      postActionPollutionScore?: number | null;
      wasteCategories?: WasteCategorySlug[] | null;
      volunteerParticipation?: ActionVolunteerParticipation | null;
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
  daysWindow: number | null;
  items: ActionMapItem[];
  partialSource?: boolean;
  sourceHealth?: {
    partial: boolean;
    failedSources: ActionSourceName[];
    availableSources: ActionSourceName[];
    warnings: string[];
  };
};
