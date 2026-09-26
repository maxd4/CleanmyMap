import type { FormState } from "./form/model";

export type { FormState };

export type SubmissionState ="idle" |"pending" |"success" |"error";
export type DeclarationMode = "quick" | "complete";

export type ValidationIssue = {
 field:
|"associationName"
|"organizerType"
 |"organizerId"
 |"organizerName"
 |"actionDate"
 |"locationLabel"
 |"manualDrawing"
 |"gpxImport"
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
