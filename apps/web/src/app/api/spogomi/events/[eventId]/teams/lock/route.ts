import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { SpogomiCompositionProtectionError, lockSpogomiTeams } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { z } from "zod";

export const runtime = "nodejs";
// Justification Vercel: team locking changes certification state and must not be statically rendered.
export const dynamic = "force-dynamic";

const lockSchema = z.object({ expectedRevision: z.number().int().nonnegative().optional(), divisionId: z.string().uuid().optional() });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = lockSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Révision de composition invalide." }, { status: 422 });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    return NextResponse.json(await lockSpogomiTeams(supabase, authorized.event, access.userId, parsed.data.expectedRevision, parsed.data.divisionId));
  } catch (error) {
    if (error instanceof SpogomiCompositionProtectionError) {
      return NextResponse.json({ error: error.message, kind: "validation", status: "error" }, { status: 409 });
    }
    return handleApiError(error, "spogomi.teams.lock");
  }
}
