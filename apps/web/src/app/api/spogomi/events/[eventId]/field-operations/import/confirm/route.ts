import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiFieldOperationsAccess } from "@/lib/spogomi/field-operations-service";
import { confirmSpogomiMeasurementImport } from "@/lib/spogomi/field-measurement-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ divisionId: z.string().uuid(), importId: z.string().uuid(), selectedRowNumbers: z.array(z.number().int().positive()).optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La confirmation d’import est invalide."] });
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const fieldAccess = await loadSpogomiFieldOperationsAccess({ supabase, eventId, userId: access.userId });
    if (!fieldAccess || (!fieldAccess.isOrganizer && !fieldAccess.capabilities.has("measurement_entry") && !fieldAccess.capabilities.has("weighing"))) return forbiddenJsonResponse();
    return NextResponse.json(await confirmSpogomiMeasurementImport({ supabase, eventId, ...parsed.data, actorClerkId: access.userId }));
  } catch (error) {
    return handleApiError(error, "spogomi.field-operations.import.confirm");
  }
}
