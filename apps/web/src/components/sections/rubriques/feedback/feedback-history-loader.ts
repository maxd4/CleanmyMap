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

  const items = value.items.map((item) => {
    const qualificationDecidedByUserId =
      item && typeof item === "object" && "qualificationDecidedByUserId" in item
        ? item.qualificationDecidedByUserId
        : null;
    const description =
      item && typeof item === "object" && typeof item.description === "string"
        ? item.description
        : "";
    const trackingStatus =
      item && typeof item === "object" && "trackingStatus" in item
        ? item.trackingStatus
        : "not_planned";
    const trackingPublicSummary =
      item && typeof item === "object" && "trackingPublicSummary" in item
        ? item.trackingPublicSummary
        : null;
    const trackingReference =
      item && typeof item === "object" && "trackingReference" in item
        ? item.trackingReference
        : null;
    const trackingShippedOn =
      item && typeof item === "object" && "trackingShippedOn" in item
        ? item.trackingShippedOn
        : null;
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.createdAt !== "string" ||
      !isPersonalFeedbackStatus(item.status) ||
      !isPersonalFeedbackType(item.type) ||
      !isPersonalFeedbackQualificationStatus(item.qualificationStatus) ||
      !isPersonalFeedbackTrackingStatus(trackingStatus) ||
      (qualificationDecidedByUserId !== null &&
        typeof qualificationDecidedByUserId !== "string") ||
      (typeof trackingPublicSummary !== "string" && trackingPublicSummary !== null) ||
      (typeof trackingReference !== "string" && trackingReference !== null) ||
      (typeof trackingShippedOn !== "string" && trackingShippedOn !== null) ||
      (item.qualificationReason !== null &&
        typeof item.qualificationReason !== "string")
    ) {
      throw new Error("Invalid personal feedback item.");
    }
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      createdAt: item.createdAt,
      status: item.status,
      qualificationStatus: item.qualificationStatus,
      qualificationReason: item.qualificationReason,
      qualificationDecidedByUserId,
      description,
      trackingStatus,
      trackingPublicSummary,
      trackingReference,
      trackingShippedOn,
    };
  });

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
