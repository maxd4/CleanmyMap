import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { revokeReportPdfShare } from "@/lib/reports/report-generation-pdf-share-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; shareId: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(_request, access.userId, { limit: 10, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;

  const { id, shareId } = await params;
  if (!isUuid(id) || !isUuid(shareId)) {
    return NextResponse.json({ error: "Lien de partage introuvable." }, { status: 404 });
  }

  try {
    const share = await revokeReportPdfShare({
      shareId,
      generationId: id,
      createdByClerkId: access.userId,
    });
    if (!share) return NextResponse.json({ error: "Lien de partage introuvable." }, { status: 404 });

    let auditWarning = false;
    try {
      await appendAdminOperationAudit({
        operationId: `report-pdf-share-revoke-${crypto.randomUUID()}`,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "admin_operation",
        outcome: "success",
        targetId: id,
        details: { operation: "revoke_report_pdf_share", shareId: share.id },
      });
    } catch (error) {
      auditWarning = true;
      console.error("Report PDF share revocation audit failed after persistence", {
        generationId: id,
        shareId: share.id,
        error,
      });
    }
    // Cache justification: revocation state is private owner-scoped metadata.
    return NextResponse.json({ revoked: true, shareId: share.id, auditWarning }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Report PDF share revocation failed", { generationId: id, shareId, error });
    return NextResponse.json({ error: "Le lien de partage n'a pas pu être révoqué." }, { status: 503 });
  }
}
