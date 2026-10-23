import type {
  ActionSubmissionMode,
  ActionWasteBreakdown,
  ActionPhotoAsset,
  ActionVisionEstimate,
  ActionWasteMeasurementMethod,
} from "@/lib/actions/types";
import {
  hasCigaretteButtsMeasurement,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import {
  hasVolunteerCategoryData,
  normalizeVolunteerParticipation,
  type ActionVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";

export type ActionNotesMeta = {
  submissionMode?: ActionSubmissionMode;
  wasteBreakdown?: ActionWasteBreakdown;
  wasteMeasurementMethod?: ActionWasteMeasurementMethod;
  cigaretteButtsKg?: number | null;
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements;
  volunteerParticipation?: ActionVolunteerParticipation;
  associationName?: string;
  groupJoinEnabled?: boolean;
  placeType?: string;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  photos?: Pick<ActionPhotoAsset, "id" | "name" | "mimeType" | "size" | "width" | "height">[];
  visionEstimate?: ActionVisionEstimate;
};

export type ActionInputMetadata = Omit<
  ActionNotesMeta,
  "cigaretteButtsMeasurements" | "volunteerParticipation" | "visionEstimate"
> & {
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
  volunteerParticipation?: ActionVolunteerParticipation | null;
  visionEstimate?: ActionVisionEstimate | null;
};

function hasNonEmptyText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasWasteBreakdownData(
  wasteBreakdown: ActionWasteBreakdown | null | undefined,
): boolean {
  return Boolean(
    wasteBreakdown &&
      Object.values(wasteBreakdown).some((value) => value !== undefined && value !== null),
  );
}

function hasStructuredWasteMetadata(metadata: ActionInputMetadata): boolean {
  return Boolean(
    hasWasteBreakdownData(metadata.wasteBreakdown) ||
      metadata.wasteMeasurementMethod ||
      metadata.cigaretteButtsKg !== undefined ||
      hasCigaretteButtsMeasurement(metadata.cigaretteButtsMeasurements),
  );
}

function hasStructuredParticipationMetadata(metadata: ActionInputMetadata): boolean {
  return Boolean(
    hasVolunteerCategoryData(metadata.volunteerParticipation) ||
      metadata.associationName?.trim() ||
      typeof metadata.groupJoinEnabled === "boolean",
  );
}

function hasStructuredLocationMetadata(metadata: ActionInputMetadata): boolean {
  return Boolean(
    metadata.placeType ||
      metadata.departureLocationLabel ||
      metadata.arrivalLocationLabel,
  );
}

function hasContentMetadata(metadata: ActionInputMetadata): boolean {
  return Boolean(
    metadata.submissionMode ||
      metadata.routeStyle ||
      hasNonEmptyText(metadata.routeAdjustmentMessage) ||
      metadata.photos?.length ||
      metadata.visionEstimate,
  );
}

export function hasActionMetadata(metadata: ActionInputMetadata): boolean {
  return (
    hasStructuredWasteMetadata(metadata) ||
    hasStructuredParticipationMetadata(metadata) ||
    hasStructuredLocationMetadata(metadata) ||
    hasContentMetadata(metadata)
  );
}

function buildStructuredMetadataPayload(metadata: ActionInputMetadata): Partial<ActionNotesMeta> {
  return {
    ...(metadata.submissionMode ? { submissionMode: metadata.submissionMode } : {}),
    ...(metadata.wasteMeasurementMethod ? { wasteMeasurementMethod: metadata.wasteMeasurementMethod } : {}),
    ...(metadata.cigaretteButtsKg !== undefined ? { cigaretteButtsKg: metadata.cigaretteButtsKg } : {}),
    ...(hasCigaretteButtsMeasurement(metadata.cigaretteButtsMeasurements)
      ? { cigaretteButtsMeasurements: metadata.cigaretteButtsMeasurements! }
      : {}),
    ...(hasVolunteerCategoryData(metadata.volunteerParticipation)
      ? { volunteerParticipation: normalizeVolunteerParticipation(metadata.volunteerParticipation) }
      : {}),
    ...(metadata.associationName?.trim() ? { associationName: metadata.associationName.trim() } : {}),
    ...(typeof metadata.groupJoinEnabled === "boolean" ? { groupJoinEnabled: metadata.groupJoinEnabled } : {}),
    ...(metadata.placeType ? { placeType: metadata.placeType } : {}),
    ...(metadata.departureLocationLabel ? { departureLocationLabel: metadata.departureLocationLabel } : {}),
    ...(metadata.arrivalLocationLabel ? { arrivalLocationLabel: metadata.arrivalLocationLabel } : {}),
  };
}

function buildContentMetadataPayload(metadata: ActionInputMetadata): Partial<ActionNotesMeta> {
  return {
    ...(metadata.routeStyle ? { routeStyle: "souple" as const } : {}),
    ...(hasNonEmptyText(metadata.routeAdjustmentMessage)
      ? { routeAdjustmentMessage: metadata.routeAdjustmentMessage.trim() }
      : {}),
    ...(metadata.photos?.length ? { photos: metadata.photos } : {}),
    ...(metadata.visionEstimate ? { visionEstimate: metadata.visionEstimate } : {}),
  };
}

function buildWasteBreakdownPayload(metadata: ActionInputMetadata): Partial<ActionNotesMeta> {
  return hasWasteBreakdownData(metadata.wasteBreakdown)
    ? { wasteBreakdown: metadata.wasteBreakdown }
    : {};
}

export function buildMetadataPayload(metadata: ActionInputMetadata): ActionNotesMeta {
  const payload: ActionNotesMeta = {
    ...buildStructuredMetadataPayload(metadata),
    ...buildContentMetadataPayload(metadata),
    ...buildWasteBreakdownPayload(metadata),
  };
  return payload;
}
