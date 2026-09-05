import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";

export const runtime = "nodejs";

type ReportGenerationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: ReportGenerationRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

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
