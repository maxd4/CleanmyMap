import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
import {
  getReportPdfArtifactForOwner,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
} from "@/lib/reports/report-generation-pdf-artifact-store";
import {
  assertReportPublicationEligibility,
  projectReportPublicationPreview,
  ReportPublicationProjectionError,
  type ReportPublicLibraryTheme,
} from "@/lib/reports/report-publication-contract";
import {
  createReportPublication,
  getReportPublicationForOwner,
  revokeReportPublication,
} from "@/lib/reports/report-publication-store";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

function parseTheme(value: unknown): ReportPublicLibraryTheme | null {
  return value === "impact" || value === "scientific" ? value : null;
}

async function loadGeneration(id: string, userId: string) {
  try {
    return await getReportGenerationSnapshotById(id, userId);
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    if (error instanceof InvalidReportGenerationSnapshotError) return NextResponse.json({ error: "Le snapshot historique est invalide ou incompatible." }, { status: 422 });
    return NextResponse.json({ error: "Impossible de charger le rapport historique." }, { status: 503 });
  }
}

async function audit(actorUserId: string, targetId: string, operation: "publish_report" | "revoke_report") {
  try {
    await appendAdminOperationAudit({
      operationId: `report-publication-${crypto.randomUUID()}`,
      at: new Date().toISOString(),
      actorUserId,
      operationType: "admin_operation",
      outcome: "success",
      targetId,
      details: { operation },
    });
  } catch (error) {
    console.error("Report publication audit failed", { targetId, operation, error });
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const { id } = await params;
  const generation = await loadGeneration(id, access.userId);
  if (generation instanceof NextResponse) return generation;
  if (!generation) return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
  const theme = parseTheme(new URL(request.url).searchParams.get("theme") ?? generation.theme ?? "impact");
  if (!theme) return NextResponse.json({ error: "Thème PDF invalide." }, { status: 400 });
  try {
    const [publication, artifact] = await Promise.all([
      getReportPublicationForOwner({ generationId: generation.id, createdByClerkId: access.userId }),
      getReportPdfArtifactForOwner({ generationId: generation.id, createdByClerkId: access.userId, theme, rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION }),
    ]);
    const preview = projectReportPublicationPreview({ generation, theme, artifactReady: artifact?.status === "ready", publishedAt: publication?.revokedAt ? null : publication?.publishedAt });
    // Cache justification: publication state is owner-scoped and must not be shared.
    return NextResponse.json({ preview, publication: publication ? { status: publication.revokedAt ? "revoked" : "published", publishedAt: publication.publishedAt } : { status: "private", publishedAt: null } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ReportPublicationProjectionError) return NextResponse.json({ error: error.message, code: "publication_not_allowed" }, { status: 422 });
    console.error("Report publication preview failed", { generationId: id, error });
    return NextResponse.json({ error: "La publication est temporairement indisponible." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const { id } = await params;
  const generation = await loadGeneration(id, access.userId);
  if (generation instanceof NextResponse) return generation;
  if (!generation) return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const theme = parseTheme(body && typeof body === "object" ? (body as Record<string, unknown>).theme : generation.theme ?? "impact");
  if (!theme) return NextResponse.json({ error: "Thème PDF invalide." }, { status: 400 });
  try {
    assertReportPublicationEligibility(generation);
    const artifact = await getReportPdfArtifactForOwner({ generationId: generation.id, createdByClerkId: access.userId, theme, rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION });
    if (!artifact || artifact.status !== "ready") return NextResponse.json({ error: "Consultez d'abord le PDF réellement accessible avant de le publier.", code: "pdf_artifact_required" }, { status: 409 });
    const publication = await createReportPublication({ generationId: generation.id, artifactId: artifact.id, createdByClerkId: access.userId, title: generation.snapshot.title, periodId: generation.snapshot.periode as import("@/lib/reports/report-publication-contract").ReportPublicLibraryPeriod, scopeLabel: generation.scopeLabel, theme, publicAuthorLabel: null });
    await audit(access.userId, generation.id, "publish_report");
    return NextResponse.json({ publication: { status: "published", publishedAt: publication.publishedAt } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ReportPublicationProjectionError) return NextResponse.json({ error: error.message, code: "publication_not_allowed" }, { status: 422 });
    console.error("Report publication failed", { generationId: id, error });
    return NextResponse.json({ error: "La publication n'a pas pu être enregistrée." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const { id } = await params;
  try {
    const publication = await revokeReportPublication({ generationId: id, createdByClerkId: access.userId });
    if (!publication) return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
    await audit(access.userId, id, "revoke_report");
    return NextResponse.json({ status: "revoked", revokedAt: publication.revokedAt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Report publication revocation failed", { generationId: id, error });
    return NextResponse.json({ error: "La révocation n'a pas pu être enregistrée." }, { status: 503 });
  }
}
