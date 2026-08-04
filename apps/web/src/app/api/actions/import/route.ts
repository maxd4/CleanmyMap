import { z } from "zod";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { createAction } from "@/lib/actions/store";
import type { ResolvedActionOrganizer } from "@/lib/actions/organizers";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { isValidAssociationName } from "@/lib/actions/association-options";
import type { ActionDataQualitySummary } from "@/lib/actions/data-quality";
import { normalizeExternalActionImport } from "@/lib/actions/unified-source";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import {
  createDryRunProof,
  hashImportPayload,
  verifyDryRunProof,
} from "@/lib/admin/dry-run-proof";
import {
  adminErrorResponse,
  adminSuccessResponse,
  newOperationId,
} from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { acquireBackpressure, releaseBackpressure } from "@/lib/backpressure";
import { isIsoDateString } from "@/lib/security/validation";

export const runtime = "nodejs";
const IMPORT_CONFIRM_PHRASE = "CONFIRMER IMPORT";

const importActionSchema = z.object({
  actorName: z.string().trim().min(1).max(200).optional(),
  associationName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((value) => isValidAssociationName(value), "Association invalide.")
    .optional(),
  actionDate: z
    .string()
    .refine(isIsoDateString, "Date attendue au format YYYY-MM-DD"),
  locationLabel: z.string().trim().min(2).max(255),
  // Les bornes sont auditees par le contrat commun pour distinguer invalide et partiel.
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  wasteKg: z.number(),
  cigaretteButts: z.number().int(),
  volunteersCount: z.number().int(),
  durationMinutes: z.number().int(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(ACTION_STATUSES).optional(),
});

const importPayloadSchema = z.object({
  items: z.array(importActionSchema).min(1).max(2000),
  dryRunProof: z.string().min(24).optional(),
  confirmPhrase: z.string().trim().max(120).optional(),
});

type ImportItem = z.infer<typeof importActionSchema>;

type PreparedImport = {
  payload: ReturnType<typeof normalizeExternalActionImport>["payload"];
  status: ActionStatus;
  dataQuality: ActionDataQualitySummary;
};

function extractProofFromRequest(
  parsed: z.infer<typeof importPayloadSchema>,
  request: Request,
): string | null {
  return parsed.dryRunProof ?? request.headers.get("x-import-dry-run-proof");
}

function extractConfirmationPhrase(
  parsed: z.infer<typeof importPayloadSchema>,
  request: Request,
): string | null {
  return parsed.confirmPhrase ?? request.headers.get("x-admin-confirmation");
}

function isValidImportConfirmationPhrase(value: string | null): boolean {
  return (value ?? "").trim().toUpperCase() === IMPORT_CONFIRM_PHRASE;
}

async function auditImportFailure(params: {
  operationId: string;
  userId: string;
  dryRun: boolean;
  code: string;
}): Promise<void> {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.userId,
    operationType: params.dryRun ? "import_dry_run" : "import_confirm",
    outcome: "error",
    details: { code: params.code },
  });
}

function prepareImportItem(item: ImportItem): PreparedImport {
  const normalized = normalizeExternalActionImport({
    type: "action",
    source: "admin_import",
    location: {
      label: item.locationLabel,
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
    },
    dates: { observedAt: item.actionDate },
    metadata: {
      actorName: item.actorName,
      associationName: item.associationName,
      wasteKg: item.wasteKg,
      cigaretteButts: item.cigaretteButts,
      volunteersCount: item.volunteersCount,
      durationMinutes: item.durationMinutes,
      notes:
        appendActionMetadataToNotes(item.notes, {
          associationName: item.associationName,
        }) ?? undefined,
    },
  });

  return {
    payload: normalized.payload,
    status: item.status ?? "approved",
    dataQuality: normalized.dataQuality,
  };
}

function buildImportStats(items: PreparedImport[]) {
  const stats = {
    withCoordinates: 0,
    missingCoordinates: 0,
    partialCoordinates: 0,
    invalidCoordinates: 0,
    totalWasteKg: 0,
    totalButts: 0,
    totalVolunteers: 0,
    blockingAnomalies: 0,
    warningAnomalies: 0,
    estimatedMeasures: 0,
    dateMin: null as string | null,
    dateMax: null as string | null,
  };

  for (const item of items) {
    const quality = item.dataQuality;
    if (quality.geolocation.state === "valid") stats.withCoordinates += 1;
    if (quality.geolocation.state !== "valid") stats.missingCoordinates += 1;
    if (quality.geolocation.state === "partial") stats.partialCoordinates += 1;
    if (quality.geolocation.state === "invalid") stats.invalidCoordinates += 1;
    stats.totalWasteKg += Number(item.payload.wasteKg || 0);
    stats.totalButts += Number(item.payload.cigaretteButts || 0);
    stats.totalVolunteers += Number(item.payload.volunteersCount || 0);
    stats.blockingAnomalies += quality.blockingAnomalies.length;
    stats.warningAnomalies += quality.warnings.length;
    if (quality.provenance.measures === "estimated") stats.estimatedMeasures += 1;
    stats.dateMin =
      stats.dateMin === null || item.payload.actionDate < stats.dateMin
        ? item.payload.actionDate
        : stats.dateMin;
    stats.dateMax =
      stats.dateMax === null || item.payload.actionDate > stats.dateMax
        ? item.payload.actionDate
        : stats.dateMax;
  }

  return stats;
}

const adminImportOrganizer = (userId: string): ResolvedActionOrganizer => ({
  userId,
  displayName: "Import administrateur",
  handle: null,
  isPrimary: true,
  sourceToken: null,
});

export async function POST(request: Request) {
  const operationId = newOperationId();
  const bp = acquireBackpressure("import", operationId);
  if (!bp.allowed) {
    return adminErrorResponse({
      status: 429,
      code: "backpressure",
      message: bp.reason || "System busy",
      hint: bp.retryAfter ? `Retry after ${bp.retryAfter} seconds` : "Try again later",
      operationId,
      details: { position: bp.position, retryAfter: bp.retryAfter },
    });
  }

  const access = await requireAdminAccess();
  if (!access.ok) {
    releaseBackpressure("import");
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      await auditImportFailure({
        operationId,
        userId: access.userId,
        dryRun,
        code: "invalid_json",
      });
      return adminErrorResponse({
        status: 400,
        code: "invalid_json",
        message: "Invalid JSON payload",
        hint: "Verifie le JSON puis relance la previsualisation dry-run.",
        operationId,
      });
    }

    const parsed = importPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      await auditImportFailure({
        operationId,
        userId: access.userId,
        dryRun,
        code: "invalid_payload",
      });
      return adminErrorResponse({
        status: 400,
        code: "invalid_payload",
        message: "Invalid payload",
        hint: "Le payload doit contenir items[] avec les champs attendus.",
        operationId,
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const preparedItems = parsed.data.items.map(prepareImportItem);
    const normalizedPayload = { items: parsed.data.items };
    const payloadHash = hashImportPayload(normalizedPayload);
    const stats = buildImportStats(preparedItems);

    if (dryRun) {
      const proof = createDryRunProof({ userId: access.userId, payloadHash });
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "import_dry_run",
        outcome: "success",
        details: { count: preparedItems.length, payloadHash, stats },
      });

      return adminSuccessResponse({
        operationId,
        payload: {
          status: "dry_run",
          count: preparedItems.length,
          stats,
          dryRunProof: proof,
        },
      });
    }

    const proofToken = extractProofFromRequest(parsed.data, request);
    if (!proofToken) {
      await auditImportFailure({
        operationId,
        userId: access.userId,
        dryRun,
        code: "dry_run_required",
      });
      return adminErrorResponse({
        status: 409,
        code: "dry_run_required",
        message: "Dry-run proof required",
        hint: "Lance d'abord un dry-run valide puis confirme avec le jeton fourni.",
        operationId,
      });
    }

    if (!isValidImportConfirmationPhrase(extractConfirmationPhrase(parsed.data, request))) {
      await auditImportFailure({
        operationId,
        userId: access.userId,
        dryRun,
        code: "confirmation_required",
      });
      return adminErrorResponse({
        status: 409,
        code: "confirmation_required",
        message: "Explicit confirmation phrase required",
        hint: `Renseigne exactement la phrase: ${IMPORT_CONFIRM_PHRASE}`,
        operationId,
      });
    }

    const verification = verifyDryRunProof({
      token: proofToken,
      userId: access.userId,
      payloadHash,
    });
    if (!verification.ok) {
      await auditImportFailure({
        operationId,
        userId: access.userId,
        dryRun,
        code: verification.code === "expired"
          ? "dry_run_expired"
          : verification.code === "mismatch"
            ? "dry_run_mismatch"
            : "dry_run_required",
      });
      const mapping =
        verification.code === "expired"
          ? {
              code: "dry_run_expired" as const,
              message: "Dry-run proof expired",
              hint: "Relance la previsualisation dry-run avant de confirmer.",
            }
          : verification.code === "mismatch"
            ? {
                code: "dry_run_mismatch" as const,
                message: "Dry-run proof mismatch",
                hint: "Le payload confirme ne correspond pas au dry-run valide.",
              }
            : {
                code: "dry_run_required" as const,
                message: "Invalid dry-run proof",
                hint: "Regenerer un dry-run valide puis confirmer.",
              };
      return adminErrorResponse({
        status: 409,
        code: mapping.code,
        message: mapping.message,
        hint: mapping.hint,
        operationId,
      });
    }

    if (stats.blockingAnomalies > 0) {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "import_confirm",
        outcome: "error",
        details: { code: "data_quality_blocking", stats },
      });
      return adminErrorResponse({
        status: 422,
        code: "data_quality_blocking",
        message: "L'import contient des anomalies bloquantes.",
        hint: "Corrige les dates, mesures ou geolocalisations partielles/invalides puis relance le dry-run.",
        operationId,
        details: stats,
      });
    }

    const supabase = getSupabaseServerClient();
    const organizer = adminImportOrganizer(access.userId);
    let importedCount = 0;
    for (const item of preparedItems) {
      await createAction(supabase, {
        userId: access.userId,
        payload: item.payload,
        organizers: [organizer],
        status: item.status,
      });
      importedCount += 1;
    }

    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "import_confirm",
      outcome: "success",
      details: { count: importedCount, stats },
    });

    return adminSuccessResponse({
      status: 201,
      operationId,
      payload: { status: "imported", count: importedCount, stats },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Admin Import] Import failed", { operationId, message });
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: dryRun ? "import_dry_run" : "import_confirm",
      outcome: "error",
      details: { code: "server_error" },
    });
    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message: "L'import a échoué.",
      hint: "Verifier la connexion Supabase et relancer l'import.",
      operationId,
    });
  } finally {
    releaseBackpressure("import");
  }
}
