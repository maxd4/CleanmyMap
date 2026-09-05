import type { ParisPressureRiskEstimate, ParisPressureRiskContribution } from "./paris-pressure-risk-contract";
import type { ParisPressureZone } from "./paris-pressure-contract";
import type { MunicipalCleaningServiceabilityZone } from "./municipal-cleaning-serviceability-contract";

export const VOLUNTEER_ADDITIONALITY_MODEL_VERSION =
  "volunteer-additionality-v1" as const;

export type VolunteerSafetyExclusionReason =
  | "active_roadway"
  | "fast_road"
  | "road_tunnel"
  | "traffic_closure_required"
  | "rail_or_metro_right_of_way"
  | "technical_right_of_way"
  | "dangerous_structure"
  | "inaccessible_embankment"
  | "private_property"
  | "barrier_crossing_required"
  | "trained_only_waste"
  | "no_pickup_waste"
  | "cleanmymap_safety_doctrine";

export type VolunteerSafetyAssessment = {
  status: "safe" | "excluded" | "unknown";
  suitability: number | null;
  confidence: number;
  exclusionReasons?: VolunteerSafetyExclusionReason[];
  evidenceIds?: string[];
};

export type MunicipalInterventionType =
  | "market_cleanup"
  | "event_cleanup"
  | "maintained_area"
  | "scheduled_operation"
  | "other_documented_operation";

export type MunicipalInterventionSignal = {
  type: MunicipalInterventionType;
  timing: "imminent" | "recent" | "active";
  strength: number;
  confidence: number;
  evidenceIds?: string[];
};

export type VolunteerAdditionalityInput = {
  zone: ParisPressureZone;
  risk: ParisPressureRiskEstimate;
  municipalCleaning: MunicipalCleaningServiceabilityZone | null;
  volunteerSafety: VolunteerSafetyAssessment;
  municipalInterventions?: readonly MunicipalInterventionSignal[];
};

export type VolunteerAdditionalityFactor = {
  raw: number | null;
  effective: number;
  confidence: number;
  influence: number;
  note: string;
};

export type VolunteerAdditionalityResult = {
  modelVersion: typeof VOLUNTEER_ADDITIONALITY_MODEL_VERSION;
  volunteerAdditionality: number;
  eligible: boolean;
  pollutionRisk: {
    value: number;
    wasteRisk: number;
    cigaretteButtRisk: number;
    confidence: number;
    recentEvents: SignalAudit;
    observedReports: SignalAudit;
    predictedSignals: SignalAudit;
  };
  historicalCleanliness: VolunteerAdditionalityFactor & {
    normalizedPressure: number | null;
    resolution: string;
  };
  municipalCleaning: {
    lowRelativeCoverage: VolunteerAdditionalityFactor;
    documentedCoverage: SignalAudit;
    documentedFrequency: {
      visitsPerWeek: number | null;
      normalized: number | null;
      confidence: number;
    };
    mechanizedAccessibility: SignalAudit;
    manualIntervention: SignalAudit;
    surfaceComplexity: SignalAudit;
    scheduledInterventionMultiplier: number;
    scheduledInterventionPenalty: number;
  };
  volunteerSuitability: {
    value: number;
    confidence: number;
    status: VolunteerSafetyAssessment["status"];
    exclusionReasons: VolunteerSafetyExclusionReason[];
  };
  confidence: {
    pollution: number;
    cleanliness: number;
    municipalCleaning: number;
    volunteerSuitability: number;
    overall: number;
  };
  adjustments: {
    bonuses: string[];
    maluses: string[];
  };
  explanation: string;
};

export type SignalAudit = {
  value: number | null;
  normalized: number | null;
  confidence: number;
  evidenceKind: "prediction" | "recent_event" | "observed_report" | "documented" | "inference" | "unknown";
  available: boolean;
};

export type AdditionalityContribution = ParisPressureRiskContribution;
