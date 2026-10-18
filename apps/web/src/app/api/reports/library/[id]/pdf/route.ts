import { NextResponse } from "next/server";
import { downloadReportPdfArtifact, getReportPdfArtifactById } from "@/lib/reports/report-generation-pdf-artifact-store";
import { REPORT_PDF_ARTIFACT_RENDERER_VERSION } from "@/lib/reports/report-generation-pdf-artifact-store";
import { getActiveReportPublicationById } from "@/lib/reports/report-publication-store";

export const runtime = "nodejs";

function attachmentFilename(title: string): string {
  const value = title.replace(/[\r\n"\\]/g, "_").trim() || "rapport";
  return `${value.toLowerCase().endsWith(".pdf") ? value : `${value}.pdf`}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const publication = await getActiveReportPublicationById((await params).id).catch(() => null);
  if (!publication) return NextResponse.json({ error: "Document publié introuvable." }, { status: 404 });
  try {
    const artifact = await getReportPdfArtifactById({ artifactId: publication.artifactId, generationId: publication.generationId, theme: publication.theme, rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION });
    if (!artifact || artifact.status !== "ready") return NextResponse.json({ error: "Le PDF publié n'est plus disponible." }, { status: 404 });
    const stored = await downloadReportPdfArtifact(artifact.storagePath);
    if (!stored.data) return NextResponse.json({ error: "Le PDF publié n'est plus disponible." }, { status: 404 });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(stored.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${attachmentFilename(publication.title)}"; filename*=UTF-8''${encodeURIComponent(attachmentFilename(publication.title))}`,
        "Content-Length": String(stored.data.size),
        // Cache justification: the public artifact must reflect revocation immediately.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Public report PDF delivery failed", { publicationId: publication.id, error });
    return NextResponse.json({ error: "Le PDF publié est temporairement indisponible." }, { status: 503 });
  }
}
