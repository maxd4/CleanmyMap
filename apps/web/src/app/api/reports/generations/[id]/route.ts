import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { deriveReportGeneration, type DerivationFailure } from "./route.derivation";

export const runtime = "nodejs";

type ReportGenerationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: ReportGenerationRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const { id } = await params;
  try {
    const generation = await getReportGenerationSnapshotById(id, access.userId);
    if (!generation) {
      return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
    }
    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) {
      return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    }
    if (error instanceof InvalidReportGenerationSnapshotError) {
      return NextResponse.json(
        { error: "Le snapshot historique est invalide ou incompatible." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Impossible de charger le rapport historique." },
      { status: 503 },
    );
  }
}

function mapDerivationFailure(failure: DerivationFailure) {
  if (failure.kind === "invalid_id") {
    return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
  }
  if (failure.kind === "invalid_snapshot") {
    return NextResponse.json({ error: "Le snapshot historique est invalide ou incompatible." }, { status: 422 });
  }
  if (failure.kind === "source_unavailable") {
    return NextResponse.json({ error: "Impossible de charger le rapport historique." }, { status: 503 });
  }
  if (failure.kind === "not_found") {
    return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
  }
  if (failure.kind === "incompatible") {
    return NextResponse.json({ error: "Ce snapshot ne contient pas les versions nécessaires pour créer une nouvelle version." }, { status: 422 });
  }
  if (failure.kind === "quota_unavailable") {
    return NextResponse.json({ error: "Quota d'export temporairement indisponible." }, { status: 503 });
  }
  if (failure.kind === "quota_exceeded") {
    return NextResponse.json({ error: "Un export détaillé a déjà été utilisé aujourd'hui.", quotaDay: failure.quotaDay }, { status: 429 });
  }
  if (failure.kind === "persistence_uncertain") {
    return NextResponse.json({
      error: "Le résultat de l'enregistrement est incertain. Ne relancez pas cette action avant vérification.",
      code: "persistence_uncertain",
      persisted: "unknown",
      generationId: failure.generationId,
    }, { status: 503 });
  }
  if (failure.kind === "audit_failed") {
    return NextResponse.json({
      error: "La nouvelle version a été enregistrée, mais son journal d'audit est indisponible. Ne relancez pas cette action.",
      code: "audit_failed_after_persistence",
      persisted: true,
      generationId: failure.generationId,
    }, { status: 503 });
  }
  return NextResponse.json({ error: "Impossible d'enregistrer la nouvelle version du rapport." }, { status: 503 });
}

export async function POST(
  request: Request,
  { params }: ReportGenerationRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const rateLimit = await verifyRateLimit(request, { limit: 5, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter, rateLimit);
  if (rateLimitResponse) return rateLimitResponse;
  const operationId = `report-derivation-${crypto.randomUUID()}`;
  const { id } = await params;
  const result = await deriveReportGeneration({ id, userId: access.userId, operationId });
  if (result.kind === "failure") return mapDerivationFailure(result.failure);
  return NextResponse.json({ item: result.item, generation: result.generation });
}
