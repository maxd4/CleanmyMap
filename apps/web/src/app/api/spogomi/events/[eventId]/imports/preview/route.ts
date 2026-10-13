import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { previewRosterImportChanges } from "@/lib/spogomi/preparation-service";
import { previewRosterFile } from "@/lib/spogomi/preparation";
import { parseSpogomiImportMapping } from "@/lib/spogomi/import-route-schemas";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: import previews depend on current authenticated event data.
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
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier CSV, TSV, XLSX, XLS ou ODS requis." }, { status: 422 });
    const mappingResult = parseSpogomiImportMapping(form.get("mapping"));
    if (!mappingResult.ok) return NextResponse.json({ error: "La correspondance de colonnes est invalide." }, { status: 422 });
    const mapping = mappingResult.mapping;
    const sheetName = form.get("sheetName");
    const headerRow = form.get("headerRow");
    const allowIncompatibleMapping = form.get("allowIncompatibleMapping") === "true";
    const options = { mapping, ...(typeof sheetName === "string" && sheetName ? { sheetName } : {}), ...(typeof headerRow === "string" && headerRow ? { headerRow: Number(headerRow) } : {}), ...(allowIncompatibleMapping ? { allowIncompatibleMapping: true } : {}) };
    const preview = await previewRosterImportChanges(supabase, event, await previewRosterFile(file, Object.keys(options).length ? options : undefined));
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error, "spogomi.roster.preview");
  }
}
