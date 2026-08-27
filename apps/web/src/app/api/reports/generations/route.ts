import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
import {
  persistReportGeneration,
} from "@/lib/reports/report-generation-history-store";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { reportGenerationPayloadSchema } from "@/lib/reports/report-generation-payload";

export const runtime = "nodejs";

const detailLevelSchema = z.enum(["concis", "default", "exhaustif"]);
const scopeKindSchema = z.enum(["global", "account", "association", "arrondissement"]);

const modulesSchema = z.object({
  dataAndCartography: z.boolean(),
  transparencyAndMethods: z.boolean(),
  rawData: z.boolean(),
  detailedFiles: z.boolean(),
});

const createPayloadSchema = z.object({
  payload: reportGenerationPayloadSchema,
  scopeKind: scopeKindSchema,
  scopeValue: z.string().max(180),
  scopeLabel: z.string().trim().min(1).max(180),
  detailLevel: detailLevelSchema,
  modules: modulesSchema,
});

const MAX_SNAPSHOT_BYTES = 2_000_000;

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const operationId = `report-generation-${randomUUID()}`;

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "invalid_json",
      },
    });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "invalid_payload",
      },
    });
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (JSON.stringify(parsed.data.payload).length > MAX_SNAPSHOT_BYTES) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "snapshot_too_large",
      },
    });
    return NextResponse.json(
      { error: "Report snapshot is too large" },
      { status: 413 },
    );
  }

  const input: ReportGenerationHistoryInput = {
    payload: parsed.data.payload,
    scopeKind: parsed.data.scopeKind,
    scopeValue: parsed.data.scopeValue,
    scopeLabel: parsed.data.scopeLabel,
    detailLevel: parsed.data.detailLevel,
    modules: parsed.data.modules,
  };
  let item: Awaited<ReturnType<typeof persistReportGeneration>>;
  try {
    item = await persistReportGeneration({
      createdByClerkId: access.userId,
      input,
    });
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "persistence",
        code: "persistence_failed",
      },
    });
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'historique du rapport." },
      { status: 503 },
    );
  }

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: access.userId,
    operationType: "admin_operation",
    outcome: "success",
    targetId: item.id,
    details: {
      operation: "persist_report_generation",
      stage: "persistence",
      scopeKind: input.scopeKind,
      detailLevel: input.detailLevel,
    },
  });

  return NextResponse.json({
    item,
    filename: buildPdfReportFilename({
      rubrique: input.payload.rubrique,
      periode: input.payload.periode,
    }),
  });
}
