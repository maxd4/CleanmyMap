import {
  ACTION_PREPARATION_CHECKLIST_DEFAULTS,
} from "@/lib/actions/preparation-contract";
import type {
 ActionGpxImportMetadata,
 ActionLocationCoordinates,
 ActionMegotsCondition,
 ActionRecordType,
 ActionRouteTopology,
 ActionGeometryMethod,
 ActionAccessMode,
 ActionWasteMeasurementMethod,
} from"@/lib/actions/types";
import type {
  CigaretteButtsInputSource,
  CigaretteButtsProvenance,
  CigaretteButtsLotSource,
} from "@/lib/waste/cigarette-butts";
import type { ActionWasteCharacterizationSlug, WasteCategorySlug } from "@/lib/waste";
import type { OrganizerReferenceStatus, OrganizerType } from "@/lib/actions/organizer-type";
import type { ActionContext } from "@/lib/actions/action-context";
import type { ActionInterventionModeSelection } from "@/lib/actions/intervention-mode";
import type { OperationalRoute } from "@/lib/route/route-operational";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";
import { estimateButtsWeightKg } from "@/lib/impact/impact-terrain-2026";
import type {
  ActionAccessibilityStatus,
  ActionEquipmentInventory,
  ActionMaterialSuggestion,
  ActionPreparationChecklistItem,
  ActionOrganizationalRelations,
  ActionRefreshmentsProvided,
} from "@/lib/actions/preparation-contract";
import type { SupportNeed } from "@/lib/actions/formalities/accompaniment";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import type { ActionFieldRoleCode } from "@/lib/actions/field-roles";

export type FormState = {
 actorName: string;
 associationName: string;
 organizerType: OrganizerType | "";
 organizerId: string | null;
 organizerName: string;
 organizerReferenceStatus: OrganizerReferenceStatus | null;
 organizerTypeDrafts: Partial<Record<OrganizerType, { organizerId: string | null; organizerName: string; associationName: string; organizerReferenceStatus?: OrganizerReferenceStatus | null }>>;
 organizationalRelations: ActionOrganizationalRelations;
  /** Empty means automatic final classification; a value is an explicit choice. */
  actionContext: ActionContext | "";
  schoolContextConfirmed: boolean;
 organizerAccounts: string;
 fieldRoleSelections: Record<string, ActionFieldRoleCode[]>;
 participantAccounts: string[];
 groupJoinEnabled: boolean;
 accessMode: ActionAccessMode;
 wasteCategories?: WasteCategorySlug[];
 actionTitle: string;
 shortDescription: string;
 communeZoneLabel: string;
 actionDate: string;
 actionTimezone: string;
 meetingTime: string;
 departureTime: string;
 locationLabel: string;
 departureLocationLabel: string;
 midRouteLocationLabel?: string;
 arrivalLocationLabel: string;
 routeTopology: ActionRouteTopology;
 geometryMethod?: ActionGeometryMethod;
 interventionMode: ActionInterventionModeSelection | null;
 routeStyle:"direct" |"souple";
 routeAdjustmentMessage: string;
 plannedObjective: "" | "repérage" |"nettoyage" |"collecte_mégots" |"action_mixte" |"sensibilisation" |"autre";
 estimatedDifficulty: "" | "facile" |"moderee" |"soutenue";
 accessibility: string;
 accessibilityStatus: ActionAccessibilityStatus;
 accessibilityAlternativeRouteVersionId: string;
 accessibilityPausePlan: string;
 accessibilityEarlyDeparturePlan: string;
 accessibilityAlternativeMissionsText: string;
 accessibilityConditionsSource: string;
 accessibilityConditionsVerifiedAt: string;
 accessibilityRouteVersionOptions: Array<{ versionId: string; label: string }>;
 formalitiesContext?: ActionFormalitiesFacts | null;
 formalitiesSupportNeeds?: SupportNeed[];
 safetyInstructions: string;
 recommendedMaterials: string;
 materialsProvided: string;
 suggestedMaterials: ActionMaterialSuggestion[];
 equipmentInventory: ActionEquipmentInventory;
 refreshmentsProvided: ActionRefreshmentsProvided;
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
 wasteCharacterizationKg: Partial<Record<ActionWasteCharacterizationSlug, string>>;
 wasteUnusualObjects: string;
 wasteSpecialHandlingWaste: string;
 cigaretteButts: string;
 cigaretteButtsCount: string; // Nouveau champ pour le nombre de mégots
 cigaretteButtsInputSource: CigaretteButtsInputSource;
  /** Read-only context hydrated from the canonical persisted measurement metadata. */
  cigaretteButtsCountProvenance: CigaretteButtsProvenance;
  cigaretteButtsMassProvenance: CigaretteButtsProvenance;
  cigaretteButtsVolumeProvenance: CigaretteButtsProvenance;
  cigaretteButtsConversionFormulaVersion: string | null;
  cigaretteButtsVolumeConversionFormulaVersion: string | null;
 cigaretteButtsCondition: ActionMegotsCondition | ""; // État explicite requis pour une conversion
 cigaretteButtsVolumeLiters: string;
  /** null keeps the legacy single-measurement path; [] explicitly clears lots. */
  cigaretteButtsLots: CigaretteButtsLotDraft[] | null;
 volunteersCount: string;
 collectorsCount: string;
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
 wasteMegotsCondition: ActionMegotsCondition | "";
 wastePlastiqueKg: string;
 wasteVerreKg: string;
 wasteMetalKg: string;
 wasteMixteKg: string;
 triQuality:"faible" |"moyenne" |"elevee";
 placeType: string;
 operationalRoute?: OperationalRoute | null;
 gpxImport?: ActionGpxImportMetadata | null;
 plannedRouteDescription?: string;
 observedRouteDescription?: string;
 plannedRouteGpx?: ActionGpxImportMetadata | null;
 routeReferenceImageMediaId?: string | null;
 routeCalibrationContext?: RouteCalibrationContext | null;
 plannerProof?: RoutePlannerProof | null;
};

export type CigaretteButtsLotDraft = {
  id: string;
  source: CigaretteButtsLotSource;
  value: string;
  condition: ActionMegotsCondition | "";
  /** True only for lots hydrated from a persisted action; their condition is historical. */
  historical?: boolean;
};

export const EMPTY_ACTION_MEASUREMENT_FIELDS = {
 wasteKg: "",
 wasteMeasurementMethod: "",
 wasteRecyclablesKg: "",
 wasteGlassKg: "",
 wasteHouseholdKg: "",
 wasteOtherKg: "",
 wasteCharacterizationKg: {},
 wasteUnusualObjects: "",
 wasteSpecialHandlingWaste: "",
 cigaretteButts: "",
 cigaretteButtsCount: "",
 cigaretteButtsInputSource: null,
  cigaretteButtsCountProvenance: "unknown",
  cigaretteButtsMassProvenance: "unknown",
  cigaretteButtsVolumeProvenance: "unknown",
  cigaretteButtsConversionFormulaVersion: null,
  cigaretteButtsVolumeConversionFormulaVersion: null,
  cigaretteButtsCondition: "",
 cigaretteButtsVolumeLiters: "",
  cigaretteButtsLots: null,
} as const;

export const initialState: FormState = {
 actorName:"",
 associationName: "Action spontanée",
 organizerType:"",
 organizerId: null,
 organizerName:"",
 organizerReferenceStatus: null,
 organizerTypeDrafts: {},
 organizationalRelations: {},
 actionContext:"",
 schoolContextConfirmed: false,
 organizerAccounts:"",
 fieldRoleSelections: {},
 participantAccounts:[],
 groupJoinEnabled: false,
 accessMode: "public",
 wasteCategories: [],
 actionTitle:"",
 shortDescription:"",
 communeZoneLabel:"",
 actionDate:"",
 actionTimezone:"Europe/Paris",
 meetingTime:"",
 departureTime:"",
 locationLabel:"",
 departureLocationLabel:"",
 midRouteLocationLabel:"",
 arrivalLocationLabel:"",
 routeTopology:"loop",
 interventionMode: null,
 routeStyle:"souple",
 routeAdjustmentMessage:"",
 plannedObjective:"",
 estimatedDifficulty:"",
 accessibility:"",
 accessibilityStatus:"not_evaluated",
 accessibilityAlternativeRouteVersionId:"",
 accessibilityPausePlan:"",
 accessibilityEarlyDeparturePlan:"",
 accessibilityAlternativeMissionsText:"",
 accessibilityConditionsSource:"",
 accessibilityConditionsVerifiedAt:"",
 accessibilityRouteVersionOptions:[],
 formalitiesContext: null,
  formalitiesSupportNeeds: [],
 safetyInstructions:"",
 recommendedMaterials:"",
 materialsProvided:"",
 suggestedMaterials:[],
 equipmentInventory: {},
 refreshmentsProvided: {},
 participantMessage:"",
 logisticsNotes:"",
 preparationChecklist: ACTION_PREPARATION_CHECKLIST_DEFAULTS.map((item) => ({ ...item })),
 checklistBeforeDeparture:"",
 recordType:"action",
 latitude:"",
 longitude:"",
  ...EMPTY_ACTION_MEASUREMENT_FIELDS,
 volunteersCount:"",
 collectorsCount:"",
 childrenCount:"",
 adultCount:"",
 retiredCount:"",
 durationMinutes:"",
 routeTargetDistanceKm:"1",
 routeTargetDistanceKmManuallySet: false,
 eventStartTime:"",
 eventEndTime:"",
 notes:"",
  wasteMegotsKg:"",
 wasteMegotsCondition:"",
 wastePlastiqueKg:"",
 wasteVerreKg:"",
 wasteMetalKg:"",
 wasteMixteKg:"",
 triQuality:"moyenne",
 placeType: "",
 operationalRoute: null,
 gpxImport: null,
 plannedRouteDescription: "",
 observedRouteDescription: "",
 plannedRouteGpx: null,
 routeReferenceImageMediaId: null,
 routeCalibrationContext: null,
};

export function createInitialFormState(
 actorName: string,
 recordType: FormState["recordType"] = "action",
): FormState {
 return {
  ...initialState,
  actorName,
  recordType,
  fieldRoleSelections: Object.fromEntries(Object.entries(initialState.fieldRoleSelections).map(([userId, roles]) => [userId, [...roles]])),
  suggestedMaterials: [...initialState.suggestedMaterials],
  equipmentInventory: { ...initialState.equipmentInventory },
  refreshmentsProvided: { ...initialState.refreshmentsProvided },
  preparationChecklist: initialState.preparationChecklist.map((item) => ({ ...item })),
 };
}

export type SubmissionState ="idle" |"pending" |"success" |"error";

export type ActionDeclarationValidationStatus =
 | "not_attempted"
 | "field_errors"
 | "blocked"
 | "validated"
 | "transmission_error"
 | "transmitted";

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
  |"geometryMethod"
 |"manualDrawing"
 |"gpxImport"
 |"wasteKg"
 |"wasteRecyclablesKg"
 |"wasteGlassKg"
 |"wasteHouseholdKg"
 |"wasteOtherKg"
 |"wasteCharacterizationKg"
 |"wasteMegotsKg"
 |"cigaretteButtsCount"
 |"cigaretteButtsVolumeLiters"
 |"cigaretteButtsLots"
 |"wasteMegotsCondition"
 |"volunteersCount"
 |"collectorsCount"
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
