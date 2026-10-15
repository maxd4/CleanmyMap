import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiAttendanceProjection, setSpogomiAttendanceStatus } from "@/lib/spogomi/attendance-service";
import { hasSpogomiCapability, resolveSpogomiEventAccess } from "@/lib/spogomi/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  divisionId: z.string().uuid().optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(0).max(10_000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

const attendanceSchema = z.object({
  divisionId: z.string().uuid(),
  participantId: z.string().uuid(),
  status: z.enum(["unknown", "present", "absent"]),
  reason: z.string().trim().min(1).max(500),
  provenance: z.string().trim().min(1).max(120),
  expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return validationErrorResponse({ body: ["Les paramètres de recherche du pointage sont invalides."] });
    const projection = await loadSpogomiAttendanceProjection({
      supabase: getSupabaseServerClient(true), eventId, userId: access.userId,
      divisionId: parsed.data.divisionId, search: parsed.data.q, page: parsed.data.page, pageSize: parsed.data.pageSize,
    });
    if (projection === false) return forbiddenJsonResponse();
    return NextResponse.json(projection);
  } catch (error) {
    return handleApiError(error, "spogomi.attendance.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 120, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const parsed = attendanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La décision de présence est invalide."] });
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const eventAccess = await resolveSpogomiEventAccess({ supabase, eventId, userId: access.userId });
    if (!eventAccess || !hasSpogomiCapability(eventAccess, "checkin")) return forbiddenJsonResponse();
    const result = await setSpogomiAttendanceStatus({ supabase, eventId, ...parsed.data, actorClerkId: access.userId });
    return NextResponse.json({ attendance: result });
  } catch (error) {
    return handleApiError(error, "spogomi.attendance.write");
  }
}
