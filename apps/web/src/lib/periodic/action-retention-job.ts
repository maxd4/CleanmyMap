import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isActionRecord, parseActionSupabaseResult, type ActionSupabaseError } from "@/lib/actions/query";

const DEFAULT_BATCH_SIZE = 100;

type RetentionRow = {
  action_id: string;
  outcome: "would_delete" | "deleted" | "blocked" | "conflict" | "failed";
  reason: string;
  last_activity_at: string;
};

export type ActionRetentionJobResult = {
  status: "dry_run" | "completed";
  scannedCount: number;
  wouldDeleteCount: number;
  deletedCount: number;
  blockedCount: number;
  conflictCount: number;
  failedCount: number;
  expiredAccessibilityRequestsStatus: "available" | "rpc_unavailable";
  expiredAccessibilityRequestsScanned: number;
  expiredAccessibilityRequestsDeleted: number;
  cutoff: string;
};

type AccessibilityRetentionResult = {
  scannedCount: number;
  deletedCount: number;
};

function parseAccessibilityRetentionResult(value: unknown): AccessibilityRetentionResult {
  if (!Array.isArray(value) || !value[0] || !isActionRecord(value[0])) {
    throw new Error("La réponse de purge des demandes privées est invalide.");
  }
  const row = value[0];
  if (!Number.isInteger(row.scanned_count) || !Number.isInteger(row.deleted_count)) {
    throw new Error("La réponse de purge des demandes privées est invalide.");
  }
  return { scannedCount: Number(row.scanned_count), deletedCount: Number(row.deleted_count) };
}

async function callAccessibilityRetentionRpc(now: Date, dryRun: boolean, batchSize: number): Promise<AccessibilityRetentionResult | null> {
  const rawResult: unknown = await getSupabaseServerClient(true).rpc(
    "purge_expired_action_accessibility_support_requests",
    { p_as_of: now.toISOString(), p_dry_run: dryRun, p_batch_size: batchSize },
  );
  const result = parseActionSupabaseResult(rawResult);
  if (result.error) {
    if (isAccessibilityRetentionRpcMissing(result.error)) return null;
    throw result.error;
  }
  return parseAccessibilityRetentionResult(result.data);
}

function isAccessibilityRetentionRpcMissing(error: ActionSupabaseError): boolean {
  const diagnostic = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return error.code === "PGRST202"
    && /public\.purge_expired_action_accessibility_support_requests\b/i.test(diagnostic)
    && /could not find (?:the )?function/i.test(diagnostic)
    && /schema cache/i.test(diagnostic);
}

function parseRetentionRows(value: unknown): RetentionRow[] {
  if (!Array.isArray(value)) throw new Error("La réponse de rétention est invalide.");
  return value.map((row) => {
    if (
      !isActionRecord(row) ||
      typeof row.action_id !== "string" ||
      typeof row.reason !== "string" ||
      typeof row.last_activity_at !== "string" ||
      !["would_delete", "deleted", "blocked", "conflict", "failed"].includes(String(row.outcome))
    ) {
      throw new Error("La réponse de rétention est invalide.");
    }
    return {
      action_id: row.action_id,
      outcome: row.outcome as RetentionRow["outcome"],
      reason: row.reason,
      last_activity_at: row.last_activity_at,
    };
  });
}

function summarize(rows: RetentionRow[]) {
  return {
    scannedCount: rows.length,
    wouldDeleteCount: rows.filter((row) => row.outcome === "would_delete").length,
    deletedCount: rows.filter((row) => row.outcome === "deleted").length,
    blockedCount: rows.filter((row) => row.outcome === "blocked").length,
    conflictCount: rows.filter((row) => row.outcome === "conflict").length,
    failedCount: rows.filter((row) => row.outcome === "failed").length,
  };
}

function getCalendarMonthCutoff(now: Date): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - 1;
  const day = now.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(day, lastDay),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  )).toISOString();
}

async function callRetentionRpc(params: {
  now: Date;
  dryRun: boolean;
  batchSize: number;
  expectedActionIds?: string[];
}): Promise<RetentionRow[]> {
  const rawResult: unknown = await getSupabaseServerClient(true).rpc(
    "purge_inactive_action_records",
    {
      p_as_of: params.now.toISOString(),
      p_dry_run: params.dryRun,
      p_batch_size: params.batchSize,
      p_expected_action_ids: params.expectedActionIds ?? null,
    },
  );
  const result = parseActionSupabaseResult(rawResult);
  if (result.error) throw result.error;
  return parseRetentionRows(result.data);
}

export async function runActionRetentionJob(params: {
  now?: Date;
  dryRun?: boolean;
  batchSize?: number;
} = {}): Promise<ActionRetentionJobResult> {
  const now = params.now ?? new Date();
  const dryRun = params.dryRun ?? false;
  const batchSize = Math.max(1, Math.min(500, Math.trunc(params.batchSize ?? DEFAULT_BATCH_SIZE)));
  const previewRows = await callRetentionRpc({ now, dryRun: true, batchSize });
  const preview = summarize(previewRows);
  const deletion = !dryRun && preview.wouldDeleteCount > 0
    ? summarize(await callRetentionRpc({
      now,
      dryRun: false,
      batchSize,
      expectedActionIds: previewRows
        .filter((row) => row.outcome === "would_delete")
        .map((row) => row.action_id),
    }))
    : null;
  const accessibilityPreview = await callAccessibilityRetentionRpc(now, true, batchSize);
  let accessibilityDeletion = accessibilityPreview
    ? { scannedCount: accessibilityPreview.scannedCount, deletedCount: 0 }
    : null;
  if (!dryRun && accessibilityPreview && accessibilityPreview.scannedCount > 0) {
    accessibilityDeletion = await callAccessibilityRetentionRpc(now, false, batchSize);
  }
  const result: ActionRetentionJobResult = {
    status: dryRun ? "dry_run" : "completed",
    scannedCount: preview.scannedCount + (deletion?.scannedCount ?? 0),
    wouldDeleteCount: preview.wouldDeleteCount,
    deletedCount: deletion?.deletedCount ?? 0,
    blockedCount: preview.blockedCount + (deletion?.blockedCount ?? 0),
    conflictCount: preview.conflictCount + (deletion?.conflictCount ?? 0),
    failedCount: preview.failedCount + (deletion?.failedCount ?? 0),
    expiredAccessibilityRequestsStatus: accessibilityDeletion ? "available" : "rpc_unavailable",
    expiredAccessibilityRequestsScanned: accessibilityDeletion?.scannedCount ?? 0,
    expiredAccessibilityRequestsDeleted: accessibilityDeletion?.deletedCount ?? 0,
    cutoff: getCalendarMonthCutoff(now),
  };
  console.info("[cron/maintenance] action-retention", {
    status: result.status,
    scannedCount: result.scannedCount,
    wouldDeleteCount: result.wouldDeleteCount,
    deletedCount: result.deletedCount,
    blockedCount: result.blockedCount,
    conflictCount: result.conflictCount,
    failedCount: result.failedCount,
    expiredAccessibilityRequestsStatus: result.expiredAccessibilityRequestsStatus,
    expiredAccessibilityRequestsDeleted: result.expiredAccessibilityRequestsDeleted,
  });
  return result;
}
