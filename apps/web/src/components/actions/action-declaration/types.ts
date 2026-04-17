import type { ActionDrawing, ActionMegotsCondition } from "@/lib/actions/types";

export type FormState = {
  actorName: string;
  associationName: string;
  enterpriseName: string;
  actionDate: string;
  locationLabel: string;
  latitude: string;
  longitude: string;
  wasteKg: string;
  cigaretteButts: string;
  volunteersCount: string;
  durationMinutes: string;
  notes: string;
  wasteMegotsKg: string;
  wasteMegotsCondition: ActionMegotsCondition;
  wastePlastiqueKg: string;
  wasteVerreKg: string;
  wasteMetalKg: string;
  wasteMixteKg: string;
  triQuality: "faible" | "moyenne" | "elevee";
  placeType: string;
};

export type SubmissionState = "idle" | "pending" | "success" | "error";
export type DeclarationMode = "quick" | "complete";

export type ValidationIssue = {
  field:
    | "associationName"
    | "enterpriseName"
    | "actionDate"
    | "locationLabel"
    | "wasteKg"
    | "volunteersCount";
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

export type DrawingState = {
  enabled: boolean;
  value: ActionDrawing | null;
  isValid: boolean;
  effectiveEnabled: boolean;
};
