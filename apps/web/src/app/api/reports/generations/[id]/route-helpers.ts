import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";

type ReportGeneration = Awaited<ReturnType<typeof getReportGenerationSnapshotById>>;

export type ReportGenerationRouteContext = { params: Promise<{ id: string }> };

export function buildReportGenerationExportHeaders(
  generation: NonNullable<ReportGeneration>,
  format: "csv" | "json",
): Record<string, string> {
  const contentType = format === "csv" ? "text/csv" : "application/json";
  return {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="${generation.filename.replace(/\.pdf$/i, `.${format}`)}"`,
    "Cache-Control": "private, no-store",
  };
}

export async function requireReportGenerationAccess(): Promise<
  { ok: true; userId: string } | Response
> {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  return { ok: true, userId: access.userId };
}

export async function executeReportGenerationRoute(
  id: string,
  userId: string,
  render: (generation: NonNullable<ReportGeneration>) => Response,
): Promise<Response> {
  try {
    const generation = await getReportGenerationSnapshotById(id, userId);
    if (!generation) {
      return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
    }
    return render(generation);
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
      { error: "Impossible d'exporter le rapport historique." },
      { status: 503 },
    );
  }
}

export function createReportGenerationExportHandler(
  format: "csv" | "json",
  render: (generation: NonNullable<ReportGeneration>) => string,
) {
  return async (_request: Request, { params }: ReportGenerationRouteContext): Promise<Response> => {
    const access = await requireReportGenerationAccess();
    if (access instanceof Response) return access;

    const { id } = await params;
    return executeReportGenerationRoute(id, access.userId, (generation) => new NextResponse(
      render(generation),
      {
        status: 200,
        headers: buildReportGenerationExportHeaders(generation, format),
      },
    ));
  };
}
