import { NextResponse } from "next/server";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";

type ReportGeneration = Awaited<ReturnType<typeof getReportGenerationSnapshotById>>;

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
