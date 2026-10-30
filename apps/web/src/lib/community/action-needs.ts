export const COMMUNITY_HELP_CATEGORIES = [
  "materiel",
  "transport",
  "renfort_benevole",
  "communication",
  "photo_video",
  "cartographie",
  "expertise",
  "logistique",
] as const;

export type CommunityHelpCategory = (typeof COMMUNITY_HELP_CATEGORIES)[number];

export const ACTION_NEED_STATUSES = ["open", "fulfilled", "cancelled"] as const;
export type ActionNeedStatus = (typeof ACTION_NEED_STATUSES)[number];
export type ActionNeedEffectiveStatus = ActionNeedStatus | "expired";

export const ACTION_NEED_TITLE_MIN_LENGTH = 3;
export const ACTION_NEED_TITLE_MAX_LENGTH = 80;
export const ACTION_NEED_DESCRIPTION_MIN_LENGTH = 1;
export const ACTION_NEED_DESCRIPTION_MAX_LENGTH = 500;
export const ACTION_NEED_QUANTITY_LABEL_MAX_LENGTH = 80;

export type ActionNeedRow = {
  id: string;
  action_id: string;
  created_by_clerk_id: string;
  category: CommunityHelpCategory;
  title: string;
  description: string;
  quantity_label: string | null;
  expires_at: string | null;
  status: ActionNeedStatus;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** `expired` is a read-time projection and is never persisted. */
export function getActionNeedEffectiveStatus(
  need: Pick<ActionNeedRow, "status" | "expires_at">,
  now = new Date(),
): ActionNeedEffectiveStatus {
  return (
    need.status === "open" &&
    need.expires_at !== null &&
    new Date(need.expires_at).getTime() < now.getTime()
  )
    ? "expired"
    : need.status;
}
