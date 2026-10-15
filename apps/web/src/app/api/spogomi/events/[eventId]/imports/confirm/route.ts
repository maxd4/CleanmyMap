import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { confirmRosterImport } from "@/lib/spogomi/preparation-service";
import { parseSpogomiImportMapping } from "@/lib/spogomi/import-route-schemas";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: import confirmation mutates certified event data and must not be statically rendered.
export const dynamic = "force-dynamic";

const selectionSchema = z.object({
  divisionId: z.string().uuid().optional(),
  sheetName: z.string().min(1).max(255).optional(),
  headerRow: z.coerce.number().int().min(1).max(60).optional(),
  acceptedRowNumbers: z.array(z.number().int().min(2).max(10002)).max(10000).optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const { event } = authorized;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return validationErrorResponse({ body: ["Le fichier original est requis pour confirmer l'import."] });
    const mappingResult = parseSpogomiImportMapping(form.get("mapping"));
    if (!mappingResult.ok) return validationErrorResponse({ body: ["La correspondance de colonnes est invalide."] });
    const mapping = mappingResult.mapping;
    let rawAcceptedRowNumbers: unknown;
    try {
      rawAcceptedRowNumbers = typeof form.get("acceptedRowNumbers") === "string" && form.get("acceptedRowNumbers") ? JSON.parse(form.get("acceptedRowNumbers") as string) : undefined;
    } catch {
      return validationErrorResponse({ body: ["La sélection de lignes est invalide."] });
    }
    const rawSelection = {
      ...(typeof form.get("divisionId") === "string" && form.get("divisionId") ? { divisionId: form.get("divisionId") } : {}),
      ...(typeof form.get("sheetName") === "string" && form.get("sheetName") ? { sheetName: form.get("sheetName") } : {}),
      ...(typeof form.get("headerRow") === "string" && form.get("headerRow") ? { headerRow: form.get("headerRow") } : {}),
      ...(rawAcceptedRowNumbers !== undefined ? { acceptedRowNumbers: rawAcceptedRowNumbers } : {}),
    };
    const parsedSelection = selectionSchema.safeParse(rawSelection);
    if (!parsedSelection.success) return validationErrorResponse({ body: ["La sélection de feuille, d’en-tête ou de lignes est invalide."] });
    const { divisionId, sheetName, headerRow, acceptedRowNumbers } = parsedSelection.data;
    const result = await confirmRosterImport({ supabase, event, userId: access.userId, file, mapping, importOptions: { sheetName, headerRow }, acceptedRowNumbers, divisionId });
    return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.roster.confirm");
  }
}
