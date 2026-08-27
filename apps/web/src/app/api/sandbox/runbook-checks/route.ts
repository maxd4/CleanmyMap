import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  listRunbookChecks,
  RunbookCheckPersistenceError,
  upsertRunbookCheck,
  type RunbookCheckResult,
  type RunbookStore,
} from "@/lib/sections/runbook-checks-store";

export const runtime = "nodejs";

const payloadSchema = z.object({
  profile: z.enum(["ops", "admin", "dev"]),
  status: z.enum(["pass", "fail"]),
  durationSeconds: z.number().int().min(1).max(3600),
  notes: z.array(z.string().min(1).max(200)).min(1).max(8),
});

type RunbookAuditSnapshot = {
  profile: "ops" | "admin" | "dev";
  status: "pass" | "fail" | null;
  durationSeconds: number | null;
  notesChanged: boolean;
};

function extractProfile(payload: unknown): "ops" | "admin" | "dev" | null {
  if (!payload || typeof payload !== "object" || !("profile" in payload)) {
    return null;
  }

  const profile = (payload as { profile?: unknown }).profile;
  return profile === "ops" || profile === "admin" || profile === "dev"
    ? profile
    : null;
}

function toRunbookAuditSnapshot(
  check: RunbookCheckResult | null,
  profile: "ops" | "admin" | "dev",
  notesChanged: boolean,
): RunbookAuditSnapshot {
  return {
    profile,
    status: check?.status ?? null,
    durationSeconds: check?.durationSeconds ?? null,
    notesChanged,
  };
}

function notesAreEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((note, index) => note === right[index]);
}

export async function GET() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const data = await listRunbookChecks();
  return NextResponse.json({ status: "ok", ...data });
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const operationId = `runbook-${randomUUID()}`;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "validation",
        partialMutation: false,
        code: "invalid_json",
      },
    });
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = payloadSchema.safeParse(payload);
  const profile = extractProfile(payload);
  const targetId = profile ? `runbook-${profile}` : undefined;
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId,
      details: {
        operation: "upsert_runbook_check",
        stage: "validation",
        partialMutation: false,
        code: "invalid_payload",
      },
    });
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const resolvedTargetId = `runbook-${parsed.data.profile}`;
  const expectedNewValue = toRunbookAuditSnapshot(
    {
      profile: parsed.data.profile,
      status: parsed.data.status,
      durationSeconds: parsed.data.durationSeconds,
      lastRunAt: "",
      notes: parsed.data.notes,
    },
    parsed.data.profile,
    true,
  );

  let previousValue: RunbookAuditSnapshot;
  let previousCheck: RunbookCheckResult | null;
  try {
    const current = await listRunbookChecks();
    previousCheck =
      current.checks.find((check) => check.profile === parsed.data.profile) ?? null;
    previousValue = toRunbookAuditSnapshot(previousCheck, parsed.data.profile, false);
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: resolvedTargetId,
      details: {
        operation: "upsert_runbook_check",
        stage: "lookup",
        partialMutation: false,
      },
    });
    return NextResponse.json(
      { error: "Impossible de lire l'état du runbook.", details: "Unavailable" },
      { status: 503 },
    );
  }

  let data: RunbookStore;
  try {
    data = await upsertRunbookCheck(parsed.data);
  } catch (error) {
    const persistenceError =
      error instanceof RunbookCheckPersistenceError ? error : null;
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: resolvedTargetId,
      details: {
        operation: "upsert_runbook_check",
        stage: persistenceError?.stage ?? "persistence",
        partialMutation: persistenceError?.partialMutation ?? false,
        previousValue,
        newValue: expectedNewValue,
        code: "persistence_failed",
      },
    });
    return NextResponse.json(
      { error: "Impossible d'enregistrer le runbook.", details: "Unavailable" },
      { status: 503 },
    );
  }

  const updatedCheck =
    data.checks.find((check) => check.profile === parsed.data.profile) ?? null;
  const newValue = toRunbookAuditSnapshot(
    updatedCheck,
    parsed.data.profile,
    !notesAreEqual(previousCheck?.notes ?? [], updatedCheck?.notes ?? parsed.data.notes),
  );

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: access.userId,
    operationType: "admin_operation",
    outcome: "success",
    targetId: resolvedTargetId,
    details: {
      operation: "upsert_runbook_check",
      stage: "post_write",
      previousValue,
      newValue,
    },
  });
  return NextResponse.json({ status: "ok", ...data });
}
