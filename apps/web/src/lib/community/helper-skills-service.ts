import type { SupabaseClient } from "@supabase/supabase-js";

import type { CommunityHelpCategory } from "./action-needs";
import {
  COMMUNITY_HELPER_SKILL_SELECT_FIELDS,
  type CommunityHelperSkillRow,
} from "./helper-skills";

export async function listCommunityHelperSkills(
  supabase: SupabaseClient,
  userId: string,
): Promise<CommunityHelperSkillRow[]> {
  const result = await supabase
    .from("community_helper_skills")
    .select(COMMUNITY_HELPER_SKILL_SELECT_FIELDS)
    .eq("user_id", userId)
    .order("category", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as CommunityHelperSkillRow[];
}
export async function replaceCommunityHelperSkills(
  supabase: SupabaseClient,
  userId: string,
  categories: readonly CommunityHelpCategory[],
): Promise<CommunityHelperSkillRow[]> {
  const result = await supabase.rpc("replace_community_helper_skills", {
    p_user_id: userId,
    p_categories: [...categories],
  });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as CommunityHelperSkillRow[];
}
