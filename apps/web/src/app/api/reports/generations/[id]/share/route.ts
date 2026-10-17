import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { resolvePublicAppUrl } from "@/lib/app-url.mjs";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
import {
  downloadReportPdfArtifact,
  getReportPdfArtifactForOwner,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
  type ReportPdfArtifactTheme,
} from "@/lib/reports/report-generation-pdf-artifact-store";
import {
  createReportPdfShare,
  createReportPdfShareToken,
  isReportPdfShareExpiryValid,
  listReportPdfSharesForOwner,
  REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS,
  REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS,
} from "@/lib/reports/report-generation-pdf-share-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseTheme(value: unknown): ReportPdfArtifactTheme | null {
  return value === "impact" || value === "scientific" ? value : null;
}

function parseExpiry(value: unknown): number | null {
  if (typeof value !== "number" || !isReportPdfShareExpiryValid(value)) return null;
  return value;
}

function publicShareProjection(share: Awaited<ReturnType<typeof listReportPdfSharesForOwner>>[number]) {
  return {
    id: share.id,
    theme: share.theme,
    rendererVersion: share.rendererVersion,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    createdAt: share.createdAt,
  };
}

function preview(params: {
  generation: Awaited<ReturnType<typeof getReportGenerationSnapshotById>>;
  theme: ReportPdfArtifactTheme;
  artifact: Awaited<ReturnType<typeof getReportPdfArtifactForOwner>>;
}) {
  if (!params.generation) throw new Error("Report generation is required for a share preview.");
  return {
    generationId: params.generation.id,
    title: params.generation.snapshot.title,
    filename: params.generation.filename,
    generatedAt: params.generation.generatedAt,
    period: params.generation.snapshot.periode,
    scope: params.generation.scopeLabel,
    detailLevel: params.generation.detailLevel,
    theme: params.theme,
    rendererVersion: params.artifact?.rendererVersion ?? REPORT_PDF_ARTIFACT_RENDERER_VERSION,
    artifactStatus: params.artifact?.status ?? "missing",
    artifactReady: params.artifact?.status === "ready",
    communicatedContent: "Le fichier PDF historique de cette variante uniquement. Aucun JSON, CSV, recalcul ou accès aux actions n'est partagé.",
  };
}

function hasConfirmedStorageAbsence(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  return candidate.status === 404 || candidate.status === "404" ||
    candidate.statusCode === 404 || candidate.statusCode === "404" ||
    candidate.code === "404" || candidate.code === "not_found";
}

async function loadOwnedGeneration(id: string, userId: string) {
  try {
    return await getReportGenerationSnapshotById(id, userId);
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) {
      return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    }
    if (error instanceof InvalidReportGenerationSnapshotError) {
      return NextResponse.json({ error: "Le snapshot historique est invalide ou incompatible." }, { status: 422 });
    }
    return NextResponse.json({ error: "Impossible de charger le rapport historique." }, { status: 503 });
  }
}

async function auditShareOperation(params: {
  operationId: string;
  actorUserId: string;
  generationId: string;
  operation: "create_report_pdf_share" | "revoke_report_pdf_share";
  shareId?: string;
}): Promise<boolean> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "admin_operation",
      outcome: "success",
      targetId: params.generationId,
      details: { operation: params.operation, shareId: params.shareId },
    });
    return true;
  } catch (error) {
    console.error("Report PDF share audit failed after persistence", {
      operationId: params.operationId,
      generationId: params.generationId,
      shareId: params.shareId,
      error,
    });
    return false;
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });

  const { id } = await params;
  const theme = parseTheme(new URL(request.url).searchParams.get("theme") ?? "impact");
  if (!theme) return NextResponse.json({ error: "Thème PDF invalide." }, { status: 400 });

  const generation = await loadOwnedGeneration(id, access.userId);
  if (generation instanceof NextResponse) return generation;
  if (!generation) return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });

  try {
    const [artifact, shares] = await Promise.all([
      getReportPdfArtifactForOwner({
        generationId: generation.id,
        createdByClerkId: access.userId,
        theme,
        rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
      }),
      listReportPdfSharesForOwner({ generationId: generation.id, createdByClerkId: access.userId }),
    ]);
    return NextResponse.json({
      preview: preview({ generation, theme, artifact }),
      shares: shares.map(publicShareProjection),
      expiryOptions: [
        REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS,
        24 * 60 * 60,
        7 * 24 * 60 * 60,
        REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS,
      ],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Report PDF share preview failed", { generationId: generation.id, error });
    return NextResponse.json({ error: "Le partage du PDF est temporairement indisponible." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 10, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  const candidate = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const theme = parseTheme(candidate.theme);
  const expiresInSeconds = parseExpiry(candidate.expiresInSeconds);
  if (!theme || expiresInSeconds === null) {
    return NextResponse.json({
      error: `Thème ou durée invalide. La durée doit être comprise entre ${REPORT_PDF_SHARE_MIN_EXPIRY_SECONDS} et ${REPORT_PDF_SHARE_MAX_EXPIRY_SECONDS} secondes.`,
    }, { status: 400 });
  }

  const generation = await loadOwnedGeneration(id, access.userId);
  if (generation instanceof NextResponse) return generation;
  if (!generation) return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });

  try {
    const artifact = await getReportPdfArtifactForOwner({
      generationId: generation.id,
      createdByClerkId: access.userId,
      theme,
      rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
    });
    if (!artifact || artifact.status !== "ready") {
      return NextResponse.json({ error: "Téléchargez d'abord ce PDF historique pour créer un lien de partage.", code: "pdf_artifact_required" }, { status: 409 });
    }
    const stored = await downloadReportPdfArtifact(artifact.storagePath);
    if (!stored.data) {
      const status = hasConfirmedStorageAbsence(stored.error) ? 409 : 503;
      return NextResponse.json({ error: status === 409 ? "Le PDF historique n'est plus disponible. Téléchargez-le à nouveau avant de le partager." : "Le stockage du PDF est temporairement indisponible." }, { status });
    }

    const token = createReportPdfShareToken();
    const share = await createReportPdfShare({
      generationId: generation.id,
      artifactId: artifact.id,
      createdByClerkId: access.userId,
      theme,
      rendererVersion: artifact.rendererVersion,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      token,
    });
    const auditOk = await auditShareOperation({
      operationId: `report-pdf-share-${crypto.randomUUID()}`,
      actorUserId: access.userId,
      generationId: generation.id,
      operation: "create_report_pdf_share",
      shareId: share.id,
    });
    return NextResponse.json({
      share: publicShareProjection(share),
      shareUrl: `${resolvePublicAppUrl()}/api/reports/shared/${encodeURIComponent(token)}`,
      auditWarning: !auditOk,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Report PDF share creation failed", { generationId: generation.id, theme, error });
    return NextResponse.json({ error: "Le lien de partage n'a pas pu être créé." }, { status: 503 });
  }
}
