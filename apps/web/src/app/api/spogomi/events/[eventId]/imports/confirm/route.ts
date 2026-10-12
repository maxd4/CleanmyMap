import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, confirmRosterImport } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rowSchema = z.object({ rowNumber: z.number().int().gt(1), name: z.string().min(1).max(160), groupPreference: z.string().max(120).nullable(), sourceRowId: z.string().max(160).nullable(), sourceFingerprint: z.string().min(1).max(32) });
const previewSchema = z.object({ format: z.enum(["csv", "xlsx"]), fileName: z.string().min(1).max(255), contentHash: z.string().regex(/^[0-9a-f]{64}$/), mapping: z.record(z.string(), z.string().optional()), importKey: z.string().uuid(), rows: z.array(rowSchema).max(10_000), errors: z.array(z.unknown()).max(10_000) });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse({ body: ["Aperçu d'import invalide."] });
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const result = await confirmRosterImport({ supabase, event, userId: access.userId, preview: parsed.data as never });
    return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.roster.confirm");
  }
}
