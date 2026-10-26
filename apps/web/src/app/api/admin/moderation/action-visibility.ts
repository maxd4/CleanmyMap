import { isActionRecord } from "@/lib/actions/query";
import type { ModerationSupabaseClient } from "./route.shared";

type ActionVisibilityRow = {
  moderation_visibility: "visible" | "hidden" | null;
};

function isActionVisibilityRow(value: unknown): value is ActionVisibilityRow {
  return (
    isActionRecord(value) &&
    (value.moderation_visibility === null ||
      value.moderation_visibility === "visible" ||
      value.moderation_visibility === "hidden")
  );
}

export async function updateActionModerationVisibility(
  supabase: ModerationSupabaseClient,
  params: {
    id: string;
    visibility: "visible" | "hidden";
    actorUserId: string;
    reason: string;
  },
): Promise<{
  found: boolean;
  previousValue: { moderationVisibility: "visible" | "hidden" } | null;
  newValue: { moderationVisibility: "visible" | "hidden" } | null;
}> {
  const current = await supabase
    .from("actions")
    .select("moderation_visibility, hidden_at, hidden_by_clerk_id, hidden_reason")
    .eq("id", params.id)
    .maybeSingle();
  if (current.error) throw new Error("Database visibility read failed");
  const currentData: unknown = current.data;
  if (currentData === null || currentData === undefined) {
    return { found: false, previousValue: null, newValue: null };
  }
  if (!isActionVisibilityRow(currentData)) {
    throw new Error("Database visibility read returned invalid data");
  }

  const now = new Date().toISOString();
  const updates =
    params.visibility === "hidden"
      ? {
          moderation_visibility: "hidden",
          hidden_at: now,
          hidden_by_clerk_id: params.actorUserId,
          hidden_reason: params.reason,
        }
      : {
          moderation_visibility: "visible",
          hidden_at: null,
          hidden_by_clerk_id: null,
          hidden_reason: null,
        };
  const updated = await supabase
    .from("actions")
    .update(updates)
    .eq("id", params.id)
    .select("moderation_visibility, hidden_at, hidden_by_clerk_id, hidden_reason")
    .maybeSingle();
  if (updated.error) throw new Error("Database visibility update failed");
  const updatedData: unknown = updated.data;
  if (updatedData === null || updatedData === undefined) {
    return {
      found: false,
      previousValue: {
        moderationVisibility: currentData.moderation_visibility ?? "visible",
      },
      newValue: null,
    };
  }
  if (!isActionVisibilityRow(updatedData)) {
    throw new Error("Database visibility update returned invalid data");
  }
  return {
    found: true,
    previousValue: {
      moderationVisibility: currentData.moderation_visibility ?? "visible",
    },
    newValue: {
      moderationVisibility: updatedData.moderation_visibility ?? "visible",
    },
  };
}
