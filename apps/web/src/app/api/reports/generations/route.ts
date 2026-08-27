import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
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

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (JSON.stringify(parsed.data.payload).length > MAX_SNAPSHOT_BYTES) {
    return NextResponse.json(
      { error: "Report snapshot is too large" },
      { status: 413 },
    );
  }

  try {
    const input: ReportGenerationHistoryInput = {
      payload: parsed.data.payload,
      scopeKind: parsed.data.scopeKind,
      scopeValue: parsed.data.scopeValue,
      scopeLabel: parsed.data.scopeLabel,
      detailLevel: parsed.data.detailLevel,
      modules: parsed.data.modules,
    };
    const item = await persistReportGeneration({
      createdByClerkId: access.userId,
      input,
    });

    return NextResponse.json({
      item,
      filename: buildPdfReportFilename({
        rubrique: input.payload.rubrique,
        periode: input.payload.periode,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'historique du rapport." },
      { status: 503 },
    );
  }
}
