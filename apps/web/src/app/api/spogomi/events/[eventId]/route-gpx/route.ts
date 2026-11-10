import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { attachOfficialGpx } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: the official route reference can be replaced and must be resolved dynamically.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const { event } = authorized;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier GPX requis." }, { status: 422 });
    const divisionId = form.get("divisionId");
    const correctionReason = form.get("correctionReason");
    const expectedRevision = form.get("expectedRevision");
    if (divisionId !== null && typeof divisionId !== "string") return NextResponse.json({ error: "Division de parcours invalide." }, { status: 422 });
    if (correctionReason !== null && typeof correctionReason !== "string") return NextResponse.json({ error: "Motif de correction invalide." }, { status: 422 });
    if (expectedRevision !== null && (typeof expectedRevision !== "string" || !/^\d+$/.test(expectedRevision))) return NextResponse.json({ error: "Révision du parcours invalide." }, { status: 422 });
    return NextResponse.json(await attachOfficialGpx({
      supabase,
      event,
      userId: access.userId,
      file,
      divisionId: divisionId || null,
      correctionReason: correctionReason || null,
      expectedRevision: expectedRevision === null ? undefined : Number(expectedRevision),
    }), { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.route.attach");
  }
}
