import {
  isActionRecord,
  isNullableString,
} from "@/lib/actions/query";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getClerkService } from "@/lib/services/clerk";
import type { LegalContentReportDecisionAction } from "@/lib/legal-content-report/legal-content-report";

type LegalContentMutationSnapshot = {
  source: "actions";
  status: string | null;
  moderationVisibility: string | null;
  authorUserId: string | null;
};

type LegalContentActionRow = {
  status: string | null;
  moderation_visibility: string | null;
  created_by_clerk_id: string | null;
};

function isLegalContentActionRow(
  value: unknown,
): value is LegalContentActionRow {
  return (
    isActionRecord(value) &&
    isNullableString(value.status) &&
    isNullableString(value.moderation_visibility) &&
    isNullableString(value.created_by_clerk_id)
  );
}

export type LegalContentMutationResult = {
  supported: boolean;
  found: boolean;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  authorEmail: string | null;
};

function normalizeContentType(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function emptyLegalContentMutationResult(
  supported: boolean,
): LegalContentMutationResult {
  return {
    supported,
    found: false,
    beforeState: {},
    afterState: {},
    authorEmail: null,
  };
}

function buildLegalContentSnapshot(
  row: LegalContentActionRow,
): LegalContentMutationSnapshot {
  return {
    source: "actions",
    status: row.status,
    moderationVisibility: row.moderation_visibility ?? "visible",
    authorUserId: row.created_by_clerk_id,
  };
}

async function readCanonicalLegalContentAction(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  contentId: string,
): Promise<LegalContentActionRow | null> {
  const current = await supabase
    .from("actions")
    .select("status, moderation_visibility, created_by_clerk_id")
    .eq("id", contentId)
    .maybeSingle();
  if (current.error) throw new Error("Canonical action moderation read failed");
  const currentData: unknown = current.data;
  if (currentData === null || currentData === undefined) return null;
  if (!isLegalContentActionRow(currentData)) {
    throw new Error("Canonical action moderation read returned invalid data");
  }
  return currentData;
}

async function persistCanonicalLegalContentAction({
  supabase,
  contentId,
  action,
  actorUserId,
  reason,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  contentId: string;
  action: Extract<LegalContentReportDecisionAction, "content_restricted" | "content_removed">;
  actorUserId: string;
  reason: string;
}): Promise<LegalContentActionRow | null> {
  const now = new Date().toISOString();
  const update = action === "content_restricted"
    ? {
        moderation_visibility: "hidden",
        hidden_at: now,
        hidden_by_clerk_id: actorUserId,
        hidden_reason: reason,
      }
    : { status: "rejected" };
  const updated = await supabase
    .from("actions")
    .update(update)
    .eq("id", contentId)
    .select("status, moderation_visibility, created_by_clerk_id")
    .maybeSingle();
  if (updated.error) throw new Error("Canonical action moderation update failed");
  const updatedData: unknown = updated.data;
  if (updatedData === null || updatedData === undefined) return null;
  if (!isLegalContentActionRow(updatedData)) {
    throw new Error("Canonical action moderation update returned invalid data");
  }
  return updatedData;
}

/**
 * Reuses the existing action moderation fields. Other report content types
 * deliberately remain decision-only until a canonical mutation service exists.
 */
export async function applyCanonicalLegalContentMutation(params: {
  action: Extract<LegalContentReportDecisionAction, "content_restricted" | "content_removed">;
  contentType: string | null;
  contentId: string | null;
  actorUserId: string;
  reason: string;
}): Promise<LegalContentMutationResult> {
  if (
    !["action", "actions"].includes(normalizeContentType(params.contentType)) ||
    !params.contentId
  ) {
    return emptyLegalContentMutationResult(false);
  }

  const supabase = getSupabaseAdminClient();
  const currentData = await readCanonicalLegalContentAction(supabase, params.contentId);
  if (!currentData) return emptyLegalContentMutationResult(true);
  const beforeState = buildLegalContentSnapshot(currentData);
  const updatedData = await persistCanonicalLegalContentAction({
    supabase,
    contentId: params.contentId,
    action: params.action,
    actorUserId: params.actorUserId,
    reason: params.reason,
  });
  if (!updatedData) {
    return {
      supported: true,
      found: false,
      beforeState,
      afterState: beforeState,
      authorEmail: null,
    };
  }

  return {
    supported: true,
    found: true,
    beforeState,
    afterState: buildLegalContentSnapshot(updatedData),
    authorEmail: await resolveAuthorEmail(updatedData.created_by_clerk_id),
  };
}

async function resolveAuthorEmail(authorUserId: unknown): Promise<string | null> {
  if (typeof authorUserId !== "string" || !authorUserId.trim()) return null;
  try {
    return await (await getClerkService()).resolveEmail(authorUserId);
  } catch {
    return null;
  }
}
