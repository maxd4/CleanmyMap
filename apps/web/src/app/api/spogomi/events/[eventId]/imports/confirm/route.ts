import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, confirmRosterImport } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: import confirmation mutates certified event data and must not be statically rendered.
export const dynamic = "force-dynamic";

const mappingSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  participantLastName: z.string().min(1).max(255).optional(),
  participantFirstName: z.string().min(1).max(255).optional(),
  group: z.string().min(1).max(255).optional(),
  sourceRowId: z.string().min(1).max(255).optional(),
  ticketReference: z.string().min(1).max(255).optional(),
  orderReference: z.string().min(1).max(255).optional(),
  orderAlternativeReference: z.string().min(1).max(255).optional(),
  ticketStatus: z.string().min(1).max(255).optional(),
  ticketDeleted: z.string().min(1).max(255).optional(),
}).strict();

const selectionSchema = z.object({
  sheetName: z.string().min(1).max(255).optional(),
  headerRow: z.coerce.number().int().min(1).max(60).optional(),
  acceptedRowNumbers: z.array(z.number().int().min(2).max(10002)).max(10000).optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return validationErrorResponse({ body: ["Le fichier original est requis pour confirmer l'import."] });
    const rawMapping = form.get("mapping");
    let mapping;
    if (rawMapping !== null) {
      if (typeof rawMapping !== "string") return validationErrorResponse({ body: ["La correspondance de colonnes est invalide."] });
      let mappingPayload: unknown;
      try {
        mappingPayload = JSON.parse(rawMapping);
      } catch {
        return validationErrorResponse({ body: ["La correspondance de colonnes est invalide."] });
      }
      const parsedMapping = mappingSchema.safeParse(mappingPayload);
      if (!parsedMapping.success) return validationErrorResponse({ body: ["La correspondance de colonnes est invalide."] });
      mapping = parsedMapping.data;
    }
    let rawAcceptedRowNumbers: unknown;
    try {
      rawAcceptedRowNumbers = typeof form.get("acceptedRowNumbers") === "string" && form.get("acceptedRowNumbers") ? JSON.parse(form.get("acceptedRowNumbers") as string) : undefined;
    } catch {
      return validationErrorResponse({ body: ["La sélection de lignes est invalide."] });
    }
    const rawSelection = {
      ...(typeof form.get("sheetName") === "string" && form.get("sheetName") ? { sheetName: form.get("sheetName") } : {}),
      ...(typeof form.get("headerRow") === "string" && form.get("headerRow") ? { headerRow: form.get("headerRow") } : {}),
      ...(rawAcceptedRowNumbers !== undefined ? { acceptedRowNumbers: rawAcceptedRowNumbers } : {}),
    };
    const parsedSelection = selectionSchema.safeParse(rawSelection);
    if (!parsedSelection.success) return validationErrorResponse({ body: ["La sélection de feuille, d’en-tête ou de lignes est invalide."] });
    const { sheetName, headerRow, acceptedRowNumbers } = parsedSelection.data;
    const result = await confirmRosterImport({ supabase, event, userId: access.userId, file, mapping, importOptions: { sheetName, headerRow }, acceptedRowNumbers });
    return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.roster.confirm");
  }
}
