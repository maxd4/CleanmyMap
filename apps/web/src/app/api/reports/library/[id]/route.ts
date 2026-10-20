import { NextResponse } from "next/server";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { getActiveReportPublicationById } from "@/lib/reports/report-publication-store";
import { projectReportPublicationRow } from "@/lib/reports/report-publication-contract";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceServerRateLimit(_request, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const publication = await getActiveReportPublicationById((await params).id);
    if (!publication) return NextResponse.json({ error: "Document publié introuvable." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
    // Cache justification: a revoked publication must disappear immediately.
    return NextResponse.json(projectReportPublicationRow(publication), { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("Public report library item failed", { error });
    return NextResponse.json({ error: "Le document publié est temporairement indisponible." }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
  }
}
