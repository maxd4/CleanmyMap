import {
  COMMUNITY_HELP_CATEGORIES,
  type CommunityHelpCategory,
} from "./action-needs";

export type CommunityHelperSkillRow = {
  user_id: string;
  category: CommunityHelpCategory;
  created_at: string;
  updated_at: string;
};

export const COMMUNITY_HELPER_SKILL_SELECT_FIELDS =
  "user_id, category, created_at, updated_at";

export function isCommunityHelpCategory(value: unknown): value is CommunityHelpCategory {
  return typeof value === "string" && COMMUNITY_HELP_CATEGORIES.includes(value as CommunityHelpCategory);
}
