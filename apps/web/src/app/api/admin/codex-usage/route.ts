import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  buildCodexMonthlyUsageEstimate,
  buildCodexUsageWeeklySnapshot,
  getCodexUsageWeeklySnapshot,
  listCodexUsageWeeklySnapshots,
  upsertCodexUsageWeeklySnapshot,
} from "@/lib/environmental-impact-estimator";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "@/lib/environmental-impact-estimator/constants";
import type { EnvironmentalImpactCodexUsageWeeklySnapshotRecord } from "@/lib/environmental-impact-estimator";

export const runtime = "nodejs";

const codexUsageWeeklyInputSchema = z.object({
  weekStart: z.string().trim().optional().nullable(),
  weekEnd: z.string().trim().optional().nullable(),
  sessionCount: z.number().finite().nonnegative().optional().nullable(),
  conversationCount: z.number().finite().nonnegative().optional().nullable(),
  turnCount: z.number().finite().nonnegative().optional().nullable(),
  toolCallCount: z.number().finite().nonnegative().optional().nullable(),
  shellCommandCount: z.number().finite().nonnegative().optional().nullable(),
  fileTouchCount: z.number().finite().nonnegative().optional().nullable(),
  testRunCount: z.number().finite().nonnegative().optional().nullable(),
  changedLineCount: z.number().finite().nonnegative().optional().nullable(),
  activeMinutes: z.number().finite().nonnegative().optional().nullable(),
  source: z.enum(["manual", "imported", "reconstructed"]).optional().nullable(),
  notes: z.array(z.string().trim()).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

function parseHistoryLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.min(24, Math.max(4, Math.trunc(parsed)));
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function buildCodexAdminPayload(historyLimit: number) {
  const snapshots = await listCodexUsageWeeklySnapshots(historyLimit);
  const aggregate = buildCodexMonthlyUsageEstimate(snapshots);

  return {
    status: "ok" as const,
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    aggregate,
    latest: snapshots[0] ?? null,
    snapshots,
  };
}

const CODEX_AUDIT_METRIC_KEYS = [
  "sessionCount",
  "conversationCount",
  "turnCount",
  "toolCallCount",
  "shellCommandCount",
  "fileTouchCount",
  "testRunCount",
  "changedLineCount",
  "activeMinutes",
  "estimatedKgCo2eProxy",
  "confidencePercent",
  "uncertaintyPercent",
] as const;

function toCodexAuditValue(
  snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null,
): Record<string, unknown> | null {
  if (!snapshot) {
    return null;
  }

  return {
    weekStart: snapshot.weekStart,
    weekEnd: snapshot.weekEnd,
    source: snapshot.source,
    ...Object.fromEntries(
      CODEX_AUDIT_METRIC_KEYS.map((key) => [key, snapshot[key]]),
    ),
  };
}

function deriveCodexTargetId(body: unknown): string {
  if (typeof body === "object" && body !== null && "weekStart" in body) {
    const weekStart = (body as { weekStart?: unknown }).weekStart;
    if (typeof weekStart === "string" && weekStart.trim().length > 0) {
      return `codex-${weekStart.trim().slice(0, 32)}`;
    }
  }
  return "codex-unknown";
}

const CODEX_AUDIT_OPERATION = "upsert_codex_usage_snapshot";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, `codex-usage-${Date.now()}`);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  try {
    return NextResponse.json(await buildCodexAdminPayload(historyLimit));
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de lire l'historique Codex hebdomadaire.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, `codex-usage-${Date.now()}`);
  }

  const url = new URL(request.url);
  const historyLimit = parseHistoryLimit(url.searchParams.get("historyLimit"));

  const operationId = `codex-usage-${randomUUID()}`;
  let targetId = "codex-unknown";
  let snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null = null;
  let previousSnapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null = null;
  let stage: "build_snapshot" | "persistence" = "build_snapshot";

  try {
    const body = codexUsageWeeklyInputSchema.parse(await readRequestBody(request));
    targetId = deriveCodexTargetId(body);
    snapshot = buildCodexUsageWeeklySnapshot(body);
    targetId = snapshot.id;
    stage = "persistence";
    previousSnapshot = await getCodexUsageWeeklySnapshot(snapshot.weekStart);
    await upsertCodexUsageWeeklySnapshot(snapshot);
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId,
      details: {
        operation: CODEX_AUDIT_OPERATION,
        stage,
        previousValue: toCodexAuditValue(previousSnapshot),
        newValue: toCodexAuditValue(snapshot),
      },
    });

    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'enregistrer la semaine Codex.",
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
      operation: CODEX_AUDIT_OPERATION,
      previousValue: toCodexAuditValue(previousSnapshot),
      newValue: toCodexAuditValue(snapshot),
    },
  });

  try {
    const payload = await buildCodexAdminPayload(historyLimit);

    return NextResponse.json({
      ...payload,
      triggeredBy: "admin-manual",
      snapshot,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible d'enregistrer la semaine Codex.",
        details: "Unavailable",
      },
      { status: 503 },
    );
  }
}
