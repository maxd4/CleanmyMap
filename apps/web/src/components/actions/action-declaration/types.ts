import type { ActionMegotsCondition } from"@/lib/actions/types";

export type FormState = {
 actorName: string;
 associationName: string;
 enterpriseName: string;
 actionDate: string;
 locationLabel: string;
 departureLocationLabel: string;
 arrivalLocationLabel: string;
 routeStyle:"direct" |"souple";
 routeAdjustmentMessage: string;
 latitude: string;
 longitude: string;
 wasteKg: string;
 cigaretteButts: string;
 cigaretteButtsCount: string; // Nouveau champ pour le nombre de mégots
 cigaretteButtsCondition: ActionMegotsCondition; // État des mégots pour conversion
 volunteersCount: string;
 durationMinutes: string;
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
};

export type SubmissionState ="idle" |"pending" |"success" |"error";
export type DeclarationMode ="quick" |"complete";

export type ValidationIssue = {
 field:
 |"associationName"
 |"enterpriseName"
 |"actionDate"
 |"locationLabel"
 |"manualDrawing"
 |"wasteKg"
 |"volunteersCount";
 message: string;
};

export type ActionDeclarationFormProps = {
 actorNameOptions: string[];
 defaultActorName: string;
 clerkIdentityLabel: string;
 clerkUserId: string;
 linkedEventId?: string;
 initialMode?: DeclarationMode;
};

export type UpdateFormField = <K extends keyof FormState>(
 key: K,
 value: FormState[K],
) => void;
