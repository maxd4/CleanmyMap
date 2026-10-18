import { NextResponse } from "next/server";
import { getActiveReportPublicationById } from "@/lib/reports/report-publication-store";
import { projectReportPublicationRow } from "@/lib/reports/report-publication-contract";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const publication = await getActiveReportPublicationById((await params).id);
    if (!publication) return NextResponse.json({ error: "Document publié introuvable." }, { status: 404 });
    return NextResponse.json(projectReportPublicationRow(publication), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public report library item failed", { error });
    return NextResponse.json({ error: "Le document publié est temporairement indisponible." }, { status: 503 });
  }
}
