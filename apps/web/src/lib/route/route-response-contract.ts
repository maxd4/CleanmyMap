import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type {
  RouteDataLayers,
  RouteDataStatus,
  RouteRecommendationStatus,
} from "./route-data-status";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RouteGeometry, RouteStop, RouteTopology } from "./route-contract";
import type { RouteRecommendationTrace } from "./route-trace";
import type {
  RouteGuidedBudget,
  RoutePlanningMode,
} from "./route-planning-mode";
import type {
  RouteGroupAssignment,
  RoutePartitionAudit,
  RoutePartitionMetrics,
} from "./route-group-partition";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { RouteCalibrationContext } from "./route-calibration";
import type { RoutePlannerProof } from "./route-planner-proof-contract";
import type { RouteOperationalBudget } from "./route-operational-budget";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import type { StreetCleaningCorridorHandoff } from "./street-cleaning-corridor";
import type {
  MeetingOpportunity,
  MeetingOpportunityTrace,
} from "./route-meeting-opportunities";
import type { SegmentRouteSelectionMetrics } from "./pedestrian-segment-route-planner";
import type { RouteObservedEnrichmentMetrics } from "./route-observed-enrichment";
import type {
  RoutePlannerRiskContext,
  RouteRiskHeatmap,
} from "./route-risk-heatmap-contract";
import type { RoutePollutionPotential } from "./route-pollution-potential";

export type { MeetingOpportunity } from "./route-meeting-opportunities";

export {
  isRoutePickupPreference,
} from "./route-pickup-preference";
export type { RoutePickupPreference } from "./route-pickup-preference";

/** Shared HTTP input contract for the route recommendation boundary. */
export type RouteRecommendationRequest = {
  origin?: RouteRecommendationOrigin;
  startLocation?: RouteStartSelection;
  arrival?: RouteRecommendationOrigin;
  routeTopology?: RouteTopology;
  travelBudgetMinutes?: number;
  maxStops?: number;
  priorityVsTravel?: number;
  priorityVsDistance?: number;
  planningMode?: RoutePlanningMode;
  riskFocus?: "all" | "waste" | "cigaretteButts";
  pickupPreference?: RoutePickupPreference;
  volunteers?: number;
  groupCount?: number;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
};

export type RouteOptions = {
  /** Omitted legacy drafts are interpreted as the historical loop topology. */
  routeTopology?: RouteTopology;
  priorityVsTravel: number;
  travelBudgetMinutes: number;
  maxStops: number;
  riskFocus?: "all" | "waste" | "cigaretteButts";
  volunteers: number;
  groupCount: number;
  pickupPreference: RoutePickupPreference;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  arrival?: RouteRecommendationOrigin;
  /** Optional v2 departure selection; omitted legacy drafts keep their behavior. */
  startLocation?: RouteStartSelection;
};

export type RouteStartBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type RouteStartZone = {
  label: string;
  center: { latitude: number; longitude: number };
  radiusKm: number;
  bounds: RouteStartBounds;
  provenance: "geocoded" | "bounded-search" | "user-adjusted";
  source: "geoplateforme" | "local-territory" | "user";
  confirmed: boolean;
};

export type RouteStartSelection =
  | {
      mode: "precise";
      label: string;
      origin: RouteRecommendationOrigin;
    }
  | {
      mode: "zone";
      label: string;
      zone: RouteStartZone;
    };

export type RouteResponseOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map" | "address" | "gps" | "approximate_saved_area" | "planner";
};

export type RouteRecommendationOrigin = {
  latitude: number;
  longitude: number;
  source: "browser" | "map" | "address" | "gps";
};

export type RouteOriginMode = "browser" | "map" | "address" | "gps" | "zone";

export type MeetingPointProjection = {
  coordinates: [number, number];
  cumulativeDistanceKm: number | null;
  progress: number | null;
  estimatedDurationMinutes: number | null;
  provenance: "final_geometry_midpoint" | "manual_midpoint" | "legacy_midpoint";
};

export type RouteGuidedSegment = {
  kind: "origin-link" | "collection";
  fromWaypointId: string | null;
  toWaypointId: string | null;
  distanceKm: number;
  estimatedMinutes: number;
  estimated: boolean;
};

export type RouteGuidedSectorStatus = "within" | "outside" | "unknown";

export type RouteGuidedRoutingAudit = {
  availability: "network" | "fallback-estimated";
  loopVerified: boolean;
  originVerified: boolean;
  waypointOrderVerified: boolean;
  waypointIds: string[];
  /** Null means the final collection geometry could not be verified. */
  sectorDeviationKm: number | null;
  sectorWithinBounds: boolean;
  /** Optional for compatibility with older snapshots; new audits always set it. */
  sectorStatus?: RouteGuidedSectorStatus;
  warning: string | null;
  budget: RouteGuidedBudget & {
    travelMinutes: number;
    collectionMinutesAvailable: number;
    withinBudget: boolean;
  };
};

export type RouteRecommendationResponse = {
  isLoop: boolean;
  /** Omitted by historical responses; geometry.isLoop remains the fallback. */
  routeTopology?: RouteTopology;
  planningMode: RoutePlanningMode;
  status: RouteRecommendationStatus;
  dataStatus: RouteDataStatus;
  dataLayers: RouteDataLayers;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
  origin: RouteResponseOrigin;
  /** The requested departure mode and its server-resolved provenance. */
  startLocation?: RouteStartSelection;
  arrival?: RouteResponseOrigin | null;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  guidedBudget?: RouteGuidedBudget;
  volunteers: number;
  groupCount: number;
  constraintsApplied: {
    pickupPreference: RoutePickupPreference;
  };
  loop: {
    isLoop: boolean;
    origin: RouteResponseOrigin;
    returnDistanceKm: number;
    returnMinutes: number;
    budgetRemainingMinutes: number;
  };
  withinBudget: boolean;
  serviceMinutesEstimate: number | null;
  actionMinutesEstimate?: number | null;
  eventBudgetMinutes?: number;
  actionBudgetMinutes?: number;
  organizationMarginMinutes?: number;
  totalMinutesEstimate: number | null;
  /** Versioned server composition; legacy scalar fields remain for compatibility. */
  operationalBudget?: RouteOperationalBudget;
  diagnostics: {
    loaded: number;
    eligible: number;
    excluded: number;
    selected: number;
    sourcePartial: boolean;
    truncated: boolean;
    excludedUnsafe: number;
    excludedByTravelBudget: number;
  };
  generatedAt: string;
  engineVersion: string;
  /** Historical context to carry unchanged into an action preparation payload. */
  calibrationContext?: RouteCalibrationContext;
  /** Exact planner snapshot and server proof used by the action trust boundary. */
  plannerSnapshot?: NonNullable<RouteCalibrationContext["plannerSnapshot"]>;
  plannerProof?: RoutePlannerProof;
  /** Forecast known at generation time; it may limit the operational budget only. */
  weatherContext?: PlannerWeatherContext;
  /** Side-specific cleanable corridors; unknown when no audited source proves one. */
  streetCleaningCorridors?: StreetCleaningCorridorHandoff;
  stops: RouteStop[];
  prediction: RoutePredictionSummary;
  /** The same materialized projection used by the planner, reduced to map-safe fields. */
  riskHeatmap?: RouteRiskHeatmap;
  /** Versioned predictive context carried into action preparation and history. */
  plannerRiskContext?: RoutePlannerRiskContext;
  /** Relative theoretical pollution potential; never the historical priority score. */
  pollutionPotential?: RoutePollutionPotential;
  /** Auditable segment selection when the materialized pedestrian projection is used. */
  segmentSelection?: SegmentRouteSelectionMetrics;
  observedEnrichment?: RouteObservedEnrichmentMetrics;
  trace: RouteRecommendationTrace;
  routeGeometry: RouteGeometry;
  scoreBreakdown: {
    priority: number;
    distance: number;
  };
  tradeoffs: string[];
  proactiveAssistant: {
    actNow: string;
    criticalNearby: string;
    mostUsefulAction: string;
    operationalSignalZones: string[];
    upcomingEvents: string[];
    hotspots: Array<{
      zoneLabel: string;
      operationalSignalScore: number;
      recentActions: number;
      recentSpots: number;
      eventPressure: number;
      distanceKm: number | null;
      reason: string;
    }>;
  };
  groups: RouteGroupAssignment[];
  groupRoutes: RouteGroupRoute[];
  /** Available only when one final route has an unambiguous rendezvous. */
  meetingPoint?: MeetingPointProjection | null;
  /** Optional local opportunities evaluated around the unambiguous rendezvous. */
  meetingOpportunities?: MeetingOpportunity[];
  meetingOpportunityTrace?: MeetingOpportunityTrace;
  multiRoute: RouteMultiRouteMetrics;
  partition: {
    metrics: RoutePartitionMetrics;
    audit: RoutePartitionAudit;
  };
};

export type RouteGroupRoute = RouteGroupAssignment & {
  reservedCandidateIds: string[];
  stops: RouteStop[];
  routeGeometry: RouteGeometry;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  withinBudget: boolean;
  operationalBudget?: RouteOperationalBudget;
  guidedSegments?: RouteGuidedSegment[];
  guidedRouting?: RouteGuidedRoutingAudit;
  /** Derived independently for this group's final geometry. */
  meetingPoint?: MeetingPointProjection | null;
  meetingOpportunities?: MeetingOpportunity[];
  meetingOpportunityTrace?: MeetingOpportunityTrace;
};

export type RouteMultiRouteMetrics = {
  groupCount: number;
  volunteers: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  coverageGain: number;
  sharedTargetRatio: number;
  sharedDistanceKm: number | null;
  sharedDistanceRatio: number | null;
  /** Shared/proximate movement; independent from cleaning duplication. */
  networkOverlap?: number | null;
  /** Repeated cleaning of the same operational corridor. */
  cleaningCoverageOverlap?: number;
  balanceDistance: number;
  balanceDuration: number;
  balanceTargetCount: number;
  balanceVolunteerCount: number;
  fallbackGroupCount: number;
  networkDistanceMeasured: boolean;
  operationalBudgetAvailable?: boolean;
  totalOperationalMinutes?: number | null;
  balanceOperationalDuration?: number | null;
};

export type RouteResponse = RouteRecommendationResponse;
