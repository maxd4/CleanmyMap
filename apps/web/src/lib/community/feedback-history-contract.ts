const PERSONAL_FEEDBACK_STATUSES = [
  "new",
  "pending",
  "responded",
  "treated",
  "archived",
] as const;

const PERSONAL_FEEDBACK_QUALIFICATION_STATUSES = [
  "pending",
  "needs_info",
  "accepted",
  "duplicate",
  "rejected",
] as const;

export type PersonalFeedbackQualificationStatus =
  (typeof PERSONAL_FEEDBACK_QUALIFICATION_STATUSES)[number];

export type PersonalFeedbackStatus = (typeof PERSONAL_FEEDBACK_STATUSES)[number];

const PERSONAL_FEEDBACK_TRACKING_STATUSES = [
  "not_planned",
  "under_study",
  "planned",
  "in_progress",
  "shipped",
] as const;

export type PersonalFeedbackTrackingStatus =
  (typeof PERSONAL_FEEDBACK_TRACKING_STATUSES)[number];

export type PersonalFeedbackItem = {
  id: string;
  title: string;
  type: "bug" | "idea" | "improvement" | "collaboration";
  createdAt: string;
  status: PersonalFeedbackStatus;
  qualificationStatus: PersonalFeedbackQualificationStatus;
  qualificationReason: string | null;
  qualificationDecidedByUserId: string | null;
  description: string;
  trackingStatus: PersonalFeedbackTrackingStatus;
  trackingPublicSummary: string | null;
  trackingReference: string | null;
  trackingShippedOn: string | null;
};

export type PersonalFeedbackPage = {
  status: "ok";
  items: PersonalFeedbackItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function isPersonalFeedbackStatus(
  value: unknown,
): value is PersonalFeedbackStatus {
  return (
    typeof value === "string" &&
    PERSONAL_FEEDBACK_STATUSES.includes(value as PersonalFeedbackStatus)
  );
}

export function isPersonalFeedbackQualificationStatus(
  value: unknown,
): value is PersonalFeedbackQualificationStatus {
  return (
    typeof value === "string" &&
    PERSONAL_FEEDBACK_QUALIFICATION_STATUSES.includes(
      value as PersonalFeedbackQualificationStatus,
    )
  );
}

export function isPersonalFeedbackTrackingStatus(
  value: unknown,
): value is PersonalFeedbackTrackingStatus {
  return (
    typeof value === "string" &&
    PERSONAL_FEEDBACK_TRACKING_STATUSES.includes(
      value as PersonalFeedbackTrackingStatus,
    )
  );
}
