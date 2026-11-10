import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { saveSpogomiCompositionDraft } from "@/lib/spogomi/preparation/composition-mutation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: a grouped team draft is an organizer-authorized mutation of fresh composition state.
export const dynamic = "force-dynamic";

const teamSchema = z.object({ id: z.string().uuid().nullable(), clientKey: z.string().regex(/^local-team-[0-9]+$/).nullable(), publicName: z.string().trim().min(1).max(60), expectedPublicName: z.string().trim().max(60).nullable() }).strict();
const teamKeySchema = z.union([z.string().uuid(), z.string().regex(/^local-team-[0-9]+$/)]).nullable();
const participantSchema = z.object({ id: z.string().uuid().nullable(), clientKey: z.string().regex(/^local-place-[0-9]+$/).nullable(), privateLabel: z.string().trim().max(160).nullable(), teamKey: teamKeySchema }).strict();
const schema = z.object({ divisionId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), teams: z.array(teamSchema).min(0).max(500), participants: z.array(participantSchema).min(0).max(2000) }).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { eventId } = await context.params;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const parsed = await parseJsonBodyWithValidation(request, schema);
    if (!parsed.ok) return parsed.response;
    const result = await saveSpogomiCompositionDraft({ supabase, event: authorized.event, actorClerkId: access.userId, ...parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "spogomi.teams.draft");
  }
}
