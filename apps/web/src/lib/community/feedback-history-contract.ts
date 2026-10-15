export const PERSONAL_FEEDBACK_STATUSES = [
  "new",
  "pending",
  "responded",
  "treated",
  "archived",
] as const;

export type PersonalFeedbackStatus = (typeof PERSONAL_FEEDBACK_STATUSES)[number];

export type PersonalFeedbackItem = {
  id: string;
  title: string;
  type: "bug" | "idea" | "improvement" | "collaboration";
  createdAt: string;
  status: PersonalFeedbackStatus;
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
