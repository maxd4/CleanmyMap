import type {
 ActionMegotsCondition,
 ActionRecordType,
 ActionWasteMeasurementMethod,
} from"@/lib/actions/types";
import type { WasteCategorySlug } from "@/lib/waste";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import type { OperationalRoute } from "@/lib/route/route-operational";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";

export type FormState = {
 actorName: string;
 associationName: string;
 organizerType: OrganizerType | "";
 enterpriseName: string;
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
 routeStyle:"direct" |"souple";
 routeAdjustmentMessage: string;
 plannedObjective:"repérage" |"nettoyage" |"collecte_mégots" |"action_mixte" |"sensibilisation" |"autre";
 estimatedDifficulty:"facile" |"moderee" |"soutenue";
 accessibility: string;
 safetyInstructions: string;
 recommendedMaterials: string;
 participantMessage: string;
 creatorRole:"organisateur" |"benevole" |"association" |"etudiant" |"autre";
 preparationState:"brouillon" |"pret_a_partager" |"action_en_cours" |"a_completer_apres_action";
 logisticsNotes: string;
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
 visionBagsCount: string;
 visionFillLevel:"" |"25" |"50" |"75" |"100";
 visionDensity:"" |"sec" |"humide_dense" |"mouille";
  operationalRoute?: OperationalRoute | null;
  routeCalibrationContext?: RouteCalibrationContext | null;
  plannerProof?: RoutePlannerProof | null;
};

export type SubmissionState ="idle" |"pending" |"success" |"error";
export type DeclarationMode = "quick" | "complete";

export type ValidationIssue = {
 field:
 |"associationName"
 |"organizerType"
 |"enterpriseName"
 |"actionDate"
 |"locationLabel"
 |"manualDrawing"
 |"wasteKg"
 |"volunteersCount"
 |"eventStartTime"
 |"eventEndTime";
 message: string;
};

export type ActionDeclarationFormProps = {
 actorNameOptions: string[];
 defaultActorName: string;
 clerkIdentityLabel: string;
 clerkUserId: string;
 linkedEventId?: string;
};

export type UpdateFormField = <K extends keyof FormState>(
 key: K,
 value: FormState[K],
) => void;
