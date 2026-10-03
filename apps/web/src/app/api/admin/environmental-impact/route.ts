import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  buildEnvironmentalImpactSnapshot,
  captureEnvironmentalImpactDashboard,
  EnvironmentalImpactCaptureError,
} from "@/lib/environmental-impact-estimator/dashboard-capture";
import { parseEnvironmentalImpactHistoryLimit } from "@/lib/environmental-impact-estimator/history-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  const operationId = `env-impact-${randomUUID()}`;
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const url = new URL(request.url);
  const historyLimit = parseEnvironmentalImpactHistoryLimit(url.searchParams.get("historyLimit"));

  let targetId: string | undefined;
  let result: Awaited<ReturnType<typeof captureEnvironmentalImpactDashboard>>;
  let snapshot: ReturnType<typeof buildEnvironmentalImpactSnapshot>;

  try {
    result = await captureEnvironmentalImpactDashboard({
      userId: access.userId,
      historyLimit,
    });
    snapshot = buildEnvironmentalImpactSnapshot({
      model: result.model,
      signals: result.signals,
    });
    targetId = snapshot.id;
  } catch (error) {
    const captureError =
      error instanceof EnvironmentalImpactCaptureError ? error : null;
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: captureError?.targetId ?? targetId,
      details: {
        operation: "capture_environmental_impact_snapshot",
        stage: captureError?.stage ?? "capture",
      },
    });

    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de déclencher la capture manuelle de l'impact environnemental.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: access.userId,
    operationType: "admin_operation",
    outcome: "success",
    targetId,
    details: {
      operation: "capture_environmental_impact_snapshot",
      newValue: {
        snapshotId: snapshot.id,
        snapshotKey: snapshot.snapshotKey,
        snapshotDate: snapshot.snapshotDate,
        generatedAt: snapshot.generatedAt,
        version: snapshot.version,
      },
    },
  });

  return NextResponse.json({
    ...result,
    triggeredBy: "admin-manual",
  });
}
