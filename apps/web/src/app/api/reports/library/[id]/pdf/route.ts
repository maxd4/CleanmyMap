import { NextResponse } from "next/server";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import {
  downloadReportPdfArtifact,
  getReportPdfArtifactById,
  isConfirmedReportPdfArtifactStorageAbsence,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
} from "@/lib/reports/report-generation-pdf-artifact-store";
import { getActiveReportPublicationById } from "@/lib/reports/report-publication-store";

export const runtime = "nodejs";

const PUBLIC_REPORT_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
};

function attachmentFilename(title: string): string {
  const value = title.replace(/[\r\n"\\]/g, "_").trim() || "rapport";
  return `${value.toLowerCase().endsWith(".pdf") ? value : `${value}.pdf`}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  let publication;
  try {
    publication = await getActiveReportPublicationById((await params).id);
  } catch (error) {
    console.error("Public report publication lookup failed", { error });
    return NextResponse.json({ error: "Le document publié est temporairement indisponible." }, { status: 503, headers: PUBLIC_REPORT_HEADERS });
  }
  if (!publication) return NextResponse.json({ error: "Document publié introuvable." }, { status: 404, headers: PUBLIC_REPORT_HEADERS });
  try {
    const artifact = await getReportPdfArtifactById({ artifactId: publication.artifactId, generationId: publication.generationId, theme: publication.theme, rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION });
    if (!artifact || artifact.status !== "ready") return NextResponse.json({ error: "Le PDF publié n'est plus disponible." }, { status: 404, headers: PUBLIC_REPORT_HEADERS });
    const stored = await downloadReportPdfArtifact(artifact.storagePath);
    if (!stored.data) {
      if (isConfirmedReportPdfArtifactStorageAbsence(stored.error)) return NextResponse.json({ error: "Le PDF publié n'est plus disponible." }, { status: 404, headers: PUBLIC_REPORT_HEADERS });
      console.error("Public report PDF Storage read failed", { publicationId: publication.id, error: stored.error });
      return NextResponse.json({ error: "Le PDF publié est temporairement indisponible." }, { status: 503, headers: PUBLIC_REPORT_HEADERS });
    }
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stored.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${attachmentFilename(publication.title)}"; filename*=UTF-8''${encodeURIComponent(attachmentFilename(publication.title))}`,
        "Content-Length": String(stored.data.size),
        // Cache justification: the public artifact must reflect revocation immediately.
        ...PUBLIC_REPORT_HEADERS,
      },
    });
  } catch (error) {
    console.error("Public report PDF delivery failed", { publicationId: publication.id, error });
    return NextResponse.json({ error: "Le PDF publié est temporairement indisponible." }, { status: 503, headers: PUBLIC_REPORT_HEADERS });
  }
}
