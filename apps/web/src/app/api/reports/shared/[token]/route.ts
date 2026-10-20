import { NextResponse } from "next/server";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import {
  downloadReportPdfArtifact,
  getReportPdfArtifactById,
  isConfirmedReportPdfArtifactStorageAbsence,
} from "@/lib/reports/report-generation-pdf-artifact-store";
import {
  findActiveReportPdfShareByTokenHash,
  hashReportPdfShareToken,
} from "@/lib/reports/report-generation-pdf-share-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

function invalidShareResponse(): Response {
  return NextResponse.json(
    { error: "Lien de partage introuvable ou expiré." },
    {
      status: 404,
      headers: {
        // Cache justification: token validity and revocation must never be cached.
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

function attachmentFilename(theme: string): string {
  return `rapport_cleanmymap_${theme}.pdf`;
}

export async function GET(request: Request, { params }: RouteContext) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return invalidShareResponse();

  let share;
  try {
    share = await findActiveReportPdfShareByTokenHash({ tokenHash: hashReportPdfShareToken(token) });
  } catch (error) {
    console.error("Report PDF shared-link lookup failed", { error });
    return new Response("Le partage du PDF est temporairement indisponible.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" },
    });
  }
  if (!share) return invalidShareResponse();

  try {
    const artifact = await getReportPdfArtifactById({
      artifactId: share.artifactId,
      generationId: share.generationId,
      theme: share.theme,
      rendererVersion: share.rendererVersion,
    });
    if (!artifact || artifact.status !== "ready" ||
      artifact.createdByClerkId !== share.createdByClerkId ||
      artifact.generationId !== share.generationId ||
      artifact.theme !== share.theme ||
      artifact.rendererVersion !== share.rendererVersion) {
      return invalidShareResponse();
    }

    const downloaded = await downloadReportPdfArtifact(artifact.storagePath);
    if (!downloaded.data) {
      if (isConfirmedReportPdfArtifactStorageAbsence(downloaded.error)) return invalidShareResponse();
      console.error("Report PDF shared-link Storage read failed", { shareId: share.id, error: downloaded.error });
      return new Response("Le partage du PDF est temporairement indisponible.", {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" },
      });
    }

    return new Response(downloaded.data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${attachmentFilename(share.theme)}"`,
        "Content-Length": String(downloaded.data.size),
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
        "X-Report-Pdf-Renderer-Version": share.rendererVersion,
      },
    });
  } catch (error) {
    console.error("Report PDF shared-link delivery failed", { shareId: share.id, error });
    return new Response("Le partage du PDF est temporairement indisponible.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" },
    });
  }
}
