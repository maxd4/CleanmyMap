import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "./payload";
import type { FormState, ValidationIssue } from "./model";

export const ACTION_VALIDATION_FIELD_IDS: Record<string, string> = {
  organizerType: "action-organizer-type",
  associationName: "action-organizer-structure",
  actionDate: "action-action-date",
  arrivalLocationLabel: "arrival",
  manualDrawing: "action-disclosure-route",
  gpxImport: "gpx-import",
  wasteKg: "harvest-waste-kg",
  volunteersCount: "action-children-count",
  volunteerParticipation: "action-children-count",
  durationMinutes: "action-duration-minutes",
  eventStartTime: "action-event-start",
  eventEndTime: "action-event-end",
};

export type ActionDeclarationDisclosureAttention = {
  organization: boolean;
  collection: boolean;
  route: boolean;
  time: boolean;
};

export type ActionDeclarationDisclosureSummaries = {
  organization: string;
  collection: string | undefined;
  photo: string | undefined;
  route: string | undefined;
  time: string | undefined;
};

function hasValidationIssue(validationIssues: ValidationIssue[], fields: string[]) {
  return validationIssues.some((issue) => fields.includes(issue.field));
}

export function getActionDeclarationDisclosureAttention({
  form,
  validationIssues,
}: {
  form: FormState;
  validationIssues: ValidationIssue[];
}): ActionDeclarationDisclosureAttention {
  return {
    organization:
      hasValidationIssue(validationIssues, ["associationName", "organizerName", "organizerType"]) ||
      (form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE && !form.actorName.trim()),
    collection: hasValidationIssue(validationIssues, ["wasteKg"]),
    route:
      hasValidationIssue(validationIssues, ["locationLabel", "arrivalLocationLabel", "manualDrawing", "gpxImport"]) ||
      (form.routeTopology === "point_to_point" && !form.arrivalLocationLabel.trim()),
    time: hasValidationIssue(validationIssues, ["eventStartTime", "eventEndTime"]),
  };
}

export function getActionDeclarationDisclosureSummaries({
  form,
  photoAssets,
  visionEstimate,
  manualDrawing,
}: {
  form: FormState;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  manualDrawing: unknown;
}): ActionDeclarationDisclosureSummaries {
  return {
    organization: [
      form.participantAccounts.length > 0
        ? `${form.participantAccounts.length} participant${form.participantAccounts.length > 1 ? "s" : ""}`
        : null,
      form.organizerAccounts.trim() ? "comptes associés" : null,
    ]
      .filter(Boolean)
      .join(" · "),
    collection: form.wasteCategories?.length
      ? `${form.wasteCategories.length} catégorie${form.wasteCategories.length > 1 ? "s" : ""} de déchets`
      : form.wasteMeasurementMethod
        ? "méthode renseignée"
        : undefined,
    photo: photoAssets.length
      ? `${photoAssets.length} photo${photoAssets.length > 1 ? "s" : ""}`
      : visionEstimate
        ? "estimation disponible"
        : undefined,
    route: form.gpxImport
      ? "GPX importé"
      : manualDrawing
        ? "tracé manuel"
        : form.operationalRoute
          ? "parcours calculé"
          : undefined,
    time:
      form.eventStartTime.trim() || form.eventEndTime.trim()
        ? [form.eventStartTime, form.eventEndTime].filter(Boolean).join("–")
        : undefined,
  };
}
