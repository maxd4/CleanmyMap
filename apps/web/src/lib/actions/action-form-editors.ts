import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadActionFormEditorIds(
  supabase: SupabaseClient,
  actionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("action_form_editors")
    .select("clerk_user_id")
    .eq("action_id", actionId)
    .order("granted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => row.clerk_user_id);
}
