import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isActionRecord, parseActionSupabaseResult } from "@/lib/actions/query";

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

async function callAccessibilityRetentionRpc(now: Date, dryRun: boolean, batchSize: number): Promise<AccessibilityRetentionResult> {
  const rawResult: unknown = await getSupabaseServerClient(true).rpc(
    "purge_expired_action_accessibility_support_requests",
    { p_as_of: now.toISOString(), p_dry_run: dryRun, p_batch_size: batchSize },
  );
  const result = parseActionSupabaseResult(rawResult);
  if (result.error) throw result.error;
  return parseAccessibilityRetentionResult(result.data);
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
  const accessibilityPreview = await callAccessibilityRetentionRpc(now, true, batchSize);

  if (dryRun || preview.wouldDeleteCount === 0) {
    const accessibilityDeletion = dryRun || accessibilityPreview.scannedCount === 0
      ? { scannedCount: accessibilityPreview.scannedCount, deletedCount: 0 }
      : await callAccessibilityRetentionRpc(now, false, batchSize);
    const result: ActionRetentionJobResult = {
      status: dryRun ? "dry_run" : "completed",
      ...preview,
      deletedCount: 0,
      expiredAccessibilityRequestsScanned: accessibilityDeletion.scannedCount,
      expiredAccessibilityRequestsDeleted: accessibilityDeletion.deletedCount,
      cutoff: getCalendarMonthCutoff(now),
    };
    console.info("[cron/maintenance] action-retention", {
      status: result.status,
      scannedCount: result.scannedCount,
      wouldDeleteCount: result.wouldDeleteCount,
      blockedCount: result.blockedCount,
      conflictCount: result.conflictCount,
      failedCount: result.failedCount,
      expiredAccessibilityRequestsDeleted: result.expiredAccessibilityRequestsDeleted,
    });
    return result;
  }

  const expectedActionIds = previewRows
    .filter((row) => row.outcome === "would_delete")
    .map((row) => row.action_id);
  const deletionRows = await callRetentionRpc({
    now,
    dryRun: false,
    batchSize,
    expectedActionIds,
  });
  const deletion = summarize(deletionRows);
  const accessibilityDeletion = accessibilityPreview.scannedCount === 0
    ? { scannedCount: 0, deletedCount: 0 }
    : await callAccessibilityRetentionRpc(now, false, batchSize);
  const result: ActionRetentionJobResult = {
    status: "completed",
    scannedCount: preview.scannedCount + deletion.scannedCount,
    wouldDeleteCount: preview.wouldDeleteCount,
    deletedCount: deletion.deletedCount,
    blockedCount: preview.blockedCount + deletion.blockedCount,
    conflictCount: preview.conflictCount + deletion.conflictCount,
    failedCount: preview.failedCount + deletion.failedCount,
    expiredAccessibilityRequestsScanned: accessibilityDeletion.scannedCount,
    expiredAccessibilityRequestsDeleted: accessibilityDeletion.deletedCount,
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
    expiredAccessibilityRequestsDeleted: result.expiredAccessibilityRequestsDeleted,
  });
  return result;
}
