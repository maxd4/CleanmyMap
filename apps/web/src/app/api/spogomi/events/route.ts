import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSpogomiEvent } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: event management reads authenticated mutable SPOGOMI state.
export const dynamic = "force-dynamic";

const createSchema = z.object({
  idempotencyKey: z.string().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/),
  name: z.string().trim().min(1).max(160),
  locationLabel: z.string().trim().min(1).max(200),
  mode: z.enum(["casual", "world_cup", "mixed"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse({ body: ["Paramètres d'événement invalides."] });
  try {
    const result = await createSpogomiEvent({ supabase: getSupabaseServerClient(true), userId: access.userId, input: parsed.data });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, "spogomi.event.create");
  }
}
