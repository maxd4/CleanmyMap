import {
  ACTION_PREPARATION_CHECKLIST_DEFAULTS,
} from "@/lib/actions/preparation-contract";
import type {
 ActionGpxImportMetadata,
 ActionLocationCoordinates,
 ActionMegotsCondition,
 ActionRecordType,
 ActionRouteTopology,
 ActionWasteMeasurementMethod,
} from"@/lib/actions/types";
import type { WasteCategorySlug } from "@/lib/waste";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import type { OperationalRoute } from "@/lib/route/route-operational";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";
import { estimateButtsWeightKg } from "@/lib/impact/impact-terrain-2026";
import type {
  ActionAccessibilityStatus,
  ActionMaterialSuggestion,
  ActionPreparationChecklistItem,
} from "@/lib/actions/preparation-contract";

export type FormState = {
 actorName: string;
 associationName: string;
 organizerType: OrganizerType | "";
 organizerId: string | null;
 organizerName: string;
 organizerAccounts: string;
 participantAccounts: string[];
 groupJoinEnabled: boolean;
 wasteCategories?: WasteCategorySlug[];
 actionTitle: string;
 shortDescription: string;
 communeZoneLabel: string;
 actionDate: string;
 meetingTime: string;
 departureTime: string;
 locationLabel: string;
 departureLocationLabel: string;
 midRouteLocationLabel?: string;
 arrivalLocationLabel: string;
 routeTopology: ActionRouteTopology;
 routeStyle:"direct" |"souple";
 routeAdjustmentMessage: string;
 plannedObjective: "" | "repérage" |"nettoyage" |"collecte_mégots" |"action_mixte" |"sensibilisation" |"autre";
 estimatedDifficulty: "" | "facile" |"moderee" |"soutenue";
 accessibility: string;
 accessibilityStatus: ActionAccessibilityStatus;
 safetyInstructions: string;
 recommendedMaterials: string;
 materialsProvided: string;
 suggestedMaterials: ActionMaterialSuggestion[];
 participantMessage: string;
 logisticsNotes: string;
 preparationChecklist: ActionPreparationChecklistItem[];
 checklistBeforeDeparture: string;
 recordType: ActionRecordType;
 latitude: string;
 longitude: string;
 wasteKg: string;
 wasteMeasurementMethod: ActionWasteMeasurementMethod | "";
 wasteRecyclablesKg: string;
 wasteGlassKg: string;
 wasteHouseholdKg: string;
 wasteOtherKg: string;
 wasteUnusualObjects: string;
 wasteSpecialHandlingWaste: string;
 cigaretteButts: string;
 cigaretteButtsCount: string; // Nouveau champ pour le nombre de mégots
 cigaretteButtsCondition: ActionMegotsCondition; // État des mégots pour conversion
 cigaretteButtsVolumeLiters: string;
 volunteersCount: string;
 childrenCount: string;
 adultCount: string;
 retiredCount: string;
 durationMinutes: string;
 routeTargetDistanceKm: string;
 routeTargetDistanceKmManuallySet: boolean;
 midRouteCoordinates?: ActionLocationCoordinates | null;
 arrivalCoordinates?: ActionLocationCoordinates | null;
 eventStartTime: string;
 eventEndTime: string;
 notes: string;
 wasteMegotsKg: string;
 wasteMegotsCondition: ActionMegotsCondition;
 wastePlastiqueKg: string;
 wasteVerreKg: string;
 wasteMetalKg: string;
 wasteMixteKg: string;
 triQuality:"faible" |"moyenne" |"elevee";
 placeType: string;
 operationalRoute?: OperationalRoute | null;
 gpxImport?: ActionGpxImportMetadata | null;
 routeCalibrationContext?: RouteCalibrationContext | null;
 plannerProof?: RoutePlannerProof | null;
};

export const EMPTY_ACTION_MEASUREMENT_FIELDS = {
 wasteKg: "",
 wasteMeasurementMethod: "",
 wasteRecyclablesKg: "",
 wasteGlassKg: "",
 wasteHouseholdKg: "",
 wasteOtherKg: "",
 wasteUnusualObjects: "",
 wasteSpecialHandlingWaste: "",
 cigaretteButts: "",
 cigaretteButtsCount: "",
 cigaretteButtsCondition: "propre",
 cigaretteButtsVolumeLiters: "",
} as const;

export const initialState: FormState = {
 actorName:"",
 associationName: "Action spontanée",
 organizerType:"",
 organizerId: null,
 organizerName:"",
 organizerAccounts:"",
 participantAccounts:[],
 groupJoinEnabled: false,
 wasteCategories: [],
 actionTitle:"",
 shortDescription:"",
 communeZoneLabel:"",
 actionDate:"",
 meetingTime:"",
 departureTime:"",
 locationLabel:"",
 departureLocationLabel:"",
 midRouteLocationLabel:"",
 arrivalLocationLabel:"",
 routeTopology:"loop",
 routeStyle:"souple",
 routeAdjustmentMessage:"",
 plannedObjective:"",
 estimatedDifficulty:"",
 accessibility:"",
 accessibilityStatus:"not_evaluated",
 safetyInstructions:"",
 recommendedMaterials:"",
 materialsProvided:"",
 suggestedMaterials:[],
 participantMessage:"",
 logisticsNotes:"",
 preparationChecklist: ACTION_PREPARATION_CHECKLIST_DEFAULTS.map((item) => ({ ...item })),
 checklistBeforeDeparture:"",
 recordType:"action",
 latitude:"",
 longitude:"",
  ...EMPTY_ACTION_MEASUREMENT_FIELDS,
 volunteersCount:"1",
 childrenCount:"0",
 adultCount:"1",
 retiredCount:"0",
 durationMinutes:"",
 routeTargetDistanceKm:"1",
 routeTargetDistanceKmManuallySet: false,
 eventStartTime:"",
 eventEndTime:"",
 notes:"",
  wasteMegotsKg:"",
 wasteMegotsCondition:"propre",
 wastePlastiqueKg:"",
 wasteVerreKg:"",
 wasteMetalKg:"",
 wasteMixteKg:"",
 triQuality:"moyenne",
 placeType: "",
 operationalRoute: null,
 gpxImport: null,
 routeCalibrationContext: null,
};

export type SubmissionState ="idle" |"pending" |"success" |"error";

export type PostActionRetentionLoop = {
  summary: string;
  badge: string | null;
  xpAwarded: number;
  thanksMessage: string;
  share: {
    text: string;
    url: string;
  };
  nextActionSuggestion: string;
};

export function toRequiredNumber(input: string, fallback: number): number {
 const parsed = Number(input);
 return Number.isFinite(parsed) ? parsed : fallback;
}

export type ValidationIssue = {
 field:
 |"associationName"
 |"organizerType"
 |"actionDate"
 |"locationLabel"
 |"arrivalLocationLabel"
 |"manualDrawing"
 |"gpxImport"
 |"wasteKg"
 |"volunteersCount"
 |"volunteerParticipation"
 |"durationMinutes"
 |"eventStartTime"
 |"eventEndTime";
 message: string;
};

export function convertCigaretteButtsToKg(
 count: number,
 condition: ActionMegotsCondition,
): number {
 return estimateButtsWeightKg(count, condition);
}
