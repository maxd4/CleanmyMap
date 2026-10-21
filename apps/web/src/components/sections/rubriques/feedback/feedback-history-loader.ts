import {
  isPersonalFeedbackQualificationStatus,
  isPersonalFeedbackStatus,
  isPersonalFeedbackTrackingStatus,
  type PersonalFeedbackItem,
  type PersonalFeedbackPage,
} from "@/lib/community/feedback-history-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isPersonalFeedbackType(
  value: unknown,
): value is PersonalFeedbackItem["type"] {
  return (
    value === "bug" ||
    value === "idea" ||
    value === "improvement" ||
    value === "collaboration"
  );
}

function parsePersonalFeedbackPage(value: unknown): PersonalFeedbackPage {
  if (!isRecord(value) || value.status !== "ok" || !Array.isArray(value.items)) {
    throw new Error("Invalid personal feedback response.");
  }

  const items = value.items.map(parsePersonalFeedbackItem);

  if (
    (value.nextCursor !== null && typeof value.nextCursor !== "string") ||
    typeof value.hasMore !== "boolean"
  ) {
    throw new Error("Invalid personal feedback pagination.");
  }

  return {
    status: "ok",
    items,
    nextCursor: value.nextCursor,
    hasMore: value.hasMore,
  };
}

function parsePersonalFeedbackItem(value: unknown): PersonalFeedbackItem {
  if (!isRecord(value)) throw new Error("Invalid personal feedback item.");

  const qualificationDecidedByUserId = optionalField(value, "qualificationDecidedByUserId");
  const description = typeof value.description === "string" ? value.description : "";
  const trackingStatus = optionalField(value, "trackingStatus") ?? "not_planned";
  const trackingPublicSummary = optionalField(value, "trackingPublicSummary");
  const trackingReference = optionalField(value, "trackingReference");
  const trackingShippedOn = optionalField(value, "trackingShippedOn");
  const qualificationReason = value.qualificationReason;

  if (!isValidPersonalFeedbackItem(value, trackingStatus, qualificationDecidedByUserId, qualificationReason, trackingPublicSummary, trackingReference, trackingShippedOn)) {
    throw new Error("Invalid personal feedback item.");
  }

  return {
    id: value.id as string,
    title: value.title as string,
    type: value.type as PersonalFeedbackItem["type"],
    createdAt: value.createdAt as string,
    status: value.status as PersonalFeedbackItem["status"],
    qualificationStatus: value.qualificationStatus as PersonalFeedbackItem["qualificationStatus"],
    qualificationReason: qualificationReason as string | null,
    qualificationDecidedByUserId: qualificationDecidedByUserId as string | null,
    description,
    trackingStatus: trackingStatus as PersonalFeedbackItem["trackingStatus"],
    trackingPublicSummary: trackingPublicSummary as string | null,
    trackingReference: trackingReference as string | null,
    trackingShippedOn: trackingShippedOn as string | null,
  };
}

function optionalField(record: Record<string, unknown>, key: string): unknown {
  return key in record ? record[key] : null;
}

function isValidPersonalFeedbackItem(
  item: Record<string, unknown>,
  trackingStatus: unknown,
  qualificationDecidedByUserId: unknown,
  qualificationReason: unknown,
  trackingPublicSummary: unknown,
  trackingReference: unknown,
  trackingShippedOn: unknown,
): boolean {
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "string" &&
    isPersonalFeedbackStatus(item.status) &&
    isPersonalFeedbackType(item.type) &&
    isPersonalFeedbackQualificationStatus(item.qualificationStatus) &&
    isPersonalFeedbackTrackingStatus(trackingStatus) &&
    isNullableString(qualificationDecidedByUserId) &&
    isNullableString(trackingPublicSummary) &&
    isNullableString(trackingReference) &&
    isNullableString(trackingShippedOn) &&
    isNullableString(qualificationReason)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export async function fetchPersonalFeedbackPage(
  cursor: string | null = null,
): Promise<PersonalFeedbackPage> {
  const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`/api/community/bug-reports${search}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Unable to load personal feedback.",
    );
  }
  return parsePersonalFeedbackPage(payload);
}
