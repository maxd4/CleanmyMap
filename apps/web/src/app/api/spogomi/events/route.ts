import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSpogomiEvent, SpogomiCreationValidationError } from "@/lib/spogomi/preparation-service";
import { isDateTimeLocalValue } from "@/lib/time/civil-date";

export const runtime = "nodejs";
// Justification Vercel: event management reads authenticated mutable SPOGOMI state.
export const dynamic = "force-dynamic";

const createSchema = z.object({
  idempotencyKey: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/),
  name: z.string().trim().min(1).max(160),
  locationLabel: z.string().trim().min(1).max(200),
  mode: z.enum(["casual", "world_cup", "mixed"]),
  startsAt: z.string().refine((value) => z.string().datetime().safeParse(value).success || isDateTimeLocalValue(value), "Date d’événement invalide."),
  endsAt: z.string().nullable().optional().refine((value) => value === undefined || value === null || z.string().datetime().safeParse(value).success || isDateTimeLocalValue(value), "Date de fin invalide."),
});

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);
  const body: unknown = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  try {
    const result = await createSpogomiEvent({ supabase: getSupabaseServerClient(true), userId: access.userId, input: parsed.data });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SpogomiCreationValidationError) return validationErrorResponse(error.details);
    return handleApiError(error, "spogomi.event.create");
  }
}
