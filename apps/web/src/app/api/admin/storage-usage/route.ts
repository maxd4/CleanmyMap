import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import {
  captureStorageUsageReport,
  loadStorageUsageReport,
  StorageUsageCaptureError,
} from "@/lib/supabase/storage-usage-service";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  try {
    const report = await loadStorageUsageReport();
    const status =
      report.current.usagePercent >= 100 || report.warnings.length > 0
        ? "degraded"
        : "ok";

    return NextResponse.json({
      status,
      ...report,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        error: "Impossible de charger le suivi du stockage Supabase.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const operationId = `storage-usage-${randomUUID()}`;

  let report: Awaited<ReturnType<typeof captureStorageUsageReport>>;
  try {
    report = await captureStorageUsageReport();
  } catch (error) {
    const captureError =
      error instanceof StorageUsageCaptureError ? error : null;
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: captureError?.stage ?? "capture",
        partialMutation: captureError?.partialMutation ?? false,
        code: "capture_failed",
      },
    });
    return NextResponse.json(
      {
        status: "degraded",
        error: "Impossible de rafraîchir manuellement le suivi du stockage Supabase.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }

  const status =
    report.current.usagePercent >= 100 || report.warnings.length > 0
      ? "degraded"
      : "ok";
  const responsePayload = {
    status,
    ...report,
    triggeredBy: "manual-refresh",
  };

  if (!report.snapshotPersisted) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "post_write",
        partialMutation: false,
        code: "snapshot_not_persisted",
      },
    });
  } else {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "success",
      details: {
        operation: "capture_storage_usage_snapshot",
        stage: "post_write",
        snapshotMonth: report.snapshotMonth,
        snapshotPersisted: true,
      },
    });
  }

  return NextResponse.json(responsePayload);
}
