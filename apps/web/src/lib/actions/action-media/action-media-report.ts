import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionMediaReportReadiness = {
  readyCountByActionId: Map<string, number>;
  availability: "available" | "unavailable";
};

/**
 * Server-only aggregate for report filters.
 *
 * It deliberately selects only action ids and the canonical `ready` state. It
 * never returns storage paths, media metadata, or signed URLs to the browser.
 */
export async function loadActionMediaReportReadiness(
  supabase: SupabaseClient,
  actionIds: readonly string[],
): Promise<ActionMediaReportReadiness> {
  const ids = [...new Set(actionIds.filter((id) => id.trim().length > 0))];
  if (ids.length === 0) {
    return { readyCountByActionId: new Map(), availability: "available" };
  }

  const { data, error } = await supabase
    .from("action_media")
    .select("action_id")
    .in("action_id", ids)
    .eq("upload_state", "ready");

  if (error || !Array.isArray(data)) {
    return { readyCountByActionId: new Map(), availability: "unavailable" };
  }

  const readyCountByActionId = new Map<string, number>();
  for (const row of data as Array<{ action_id?: unknown }>) {
    if (typeof row.action_id !== "string") continue;
    readyCountByActionId.set(
      row.action_id,
      (readyCountByActionId.get(row.action_id) ?? 0) + 1,
    );
  }

  return { readyCountByActionId, availability: "available" };
}
