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
  readerUserId?: string,
): Promise<ActionMediaReportReadiness> {
  const ids = [...new Set(actionIds.filter((id) => id.trim().length > 0))];
  if (ids.length === 0) {
    return { readyCountByActionId: new Map(), availability: "available" };
  }
  if (!readerUserId?.trim()) {
    return { readyCountByActionId: new Map(), availability: "unavailable" };
  }

  const { data, error } = await supabase
    .from("action_media")
    .select("action_id, created_by_clerk_id")
    .in("action_id", ids)
    .eq("upload_state", "ready");

  if (error || !Array.isArray(data)) {
    return { readyCountByActionId: new Map(), availability: "unavailable" };
  }

  const readyCountByActionId = new Map<string, number>();
  let hasUnreadableEvidence = false;
  for (const row of data as Array<{ action_id?: unknown; created_by_clerk_id?: unknown }>) {
    if (typeof row.action_id !== "string") continue;
    if (row.created_by_clerk_id !== readerUserId) {
      hasUnreadableEvidence = true;
      continue;
    }
    readyCountByActionId.set(
      row.action_id,
      (readyCountByActionId.get(row.action_id) ?? 0) + 1,
    );
  }

  return {
    readyCountByActionId,
    availability: hasUnreadableEvidence ? "unavailable" : "available",
  };
}
