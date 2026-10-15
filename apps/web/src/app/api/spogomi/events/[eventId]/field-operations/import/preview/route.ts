import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiFieldOperationsAccess } from "@/lib/spogomi/field-operations-service";
import { previewSpogomiMeasurementWorkbook } from "@/lib/spogomi/field-measurement-import";

export const runtime = "nodejs";
// Justification Vercel: l'aperçu dépend de l'identité habilitée, de la division
// et du classeur reçu ; il ne doit pas être rendu statique ou partagé.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const formData = await request.formData();
  const divisionId = String(formData.get("divisionId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || !divisionId) return validationErrorResponse({ body: ["Un fichier et une division sont requis pour l’aperçu."] });
  try {
    const supabase = getSupabaseServerClient(true);
    const fieldAccess = await loadSpogomiFieldOperationsAccess({ supabase, eventId: (await context.params).eventId, userId: access.userId });
    if (!fieldAccess || (!fieldAccess.isOrganizer && !fieldAccess.capabilities.has("measurement_entry") && !fieldAccess.capabilities.has("weighing"))) return forbiddenJsonResponse();
    const preview = await previewSpogomiMeasurementWorkbook({ supabase, eventId: (await context.params).eventId, divisionId, file, sheetName: String(formData.get("sheetName") ?? "") || undefined, actorClerkId: access.userId });
    return NextResponse.json({ preview });
  } catch (error) {
    return handleApiError(error, "spogomi.field-operations.import.preview");
  }
}
