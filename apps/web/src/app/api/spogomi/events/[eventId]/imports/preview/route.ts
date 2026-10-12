import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, previewRosterImportChanges } from "@/lib/spogomi/preparation-service";
import { previewRosterFile } from "@/lib/spogomi/preparation";

export const runtime = "nodejs";
// Justification Vercel: import previews depend on current authenticated event data.
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
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier CSV, TSV, XLSX, XLS ou ODS requis." }, { status: 422 });
    const rawMapping = form.get("mapping");
    let mapping;
    if (rawMapping !== null) {
      if (typeof rawMapping !== "string") return NextResponse.json({ error: "La correspondance de colonnes est invalide." }, { status: 422 });
      let payload: unknown;
      try { payload = JSON.parse(rawMapping); } catch { return NextResponse.json({ error: "La correspondance de colonnes est invalide." }, { status: 422 }); }
      const parsed = mappingSchema.safeParse(payload);
      if (!parsed.success) return NextResponse.json({ error: "La correspondance de colonnes est invalide." }, { status: 422 });
      mapping = parsed.data;
    }
    const sheetName = form.get("sheetName");
    const headerRow = form.get("headerRow");
    const options = { mapping, ...(typeof sheetName === "string" && sheetName ? { sheetName } : {}), ...(typeof headerRow === "string" && headerRow ? { headerRow: Number(headerRow) } : {}) };
    const preview = await previewRosterImportChanges(supabase, event, await previewRosterFile(file, Object.keys(options).length ? options : undefined));
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error, "spogomi.roster.preview");
  }
}
