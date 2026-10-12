import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { getSpogomiRecognitionPartialDetails, reconcileSpogomiRecognition } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";

const inputSchema = z.object({
  participantId: z.string().uuid(),
  kind: z.enum(["collector", "referee", "organizer"]),
  status: z.enum(["certified", "revoked"]),
  evidenceReference: z.string().trim().min(1).max(500),
  certificationVersion: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(1000).nullable().optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  let attestationMutationApplied = false;
  try {
    const eventId = (await context.params).eventId;
    const event = await loadSpogomiEventForOrganizer(getSupabaseServerClient(true), eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Attestation SPOGOMI invalide." }, { status: 400 });
    const result = await getSupabaseServerClient(true).rpc("set_spogomi_recognition_attestation", {
      p_event_id: eventId, p_participant_id: parsed.data.participantId, p_kind: parsed.data.kind, p_status: parsed.data.status,
      p_evidence_reference: parsed.data.evidenceReference, p_certification_version: parsed.data.certificationVersion,
      p_actor_clerk_id: access.userId, p_reason: parsed.data.reason ?? null,
    });
    if (result.error) throw result.error;
    attestationMutationApplied = true;
    const reconciliation = event.state === "certified"
      ? await reconcileSpogomiRecognition({ supabase: getSupabaseServerClient(true), eventId, actorClerkId: access.userId })
      : null;
    return NextResponse.json({ status: "ok", attestation: result.data, reconciliation });
  } catch (error) {
    const partial = getSpogomiRecognitionPartialDetails(error);
    if (partial) return NextResponse.json({ error: "L’attestation est enregistrée, mais la réconciliation SPOGOMI est partielle et doit être rejouée.", reconciliation: partial }, { status: 503 });
    if (attestationMutationApplied) {
      return NextResponse.json({
        error: "L’attestation est enregistrée, mais la réconciliation SPOGOMI doit être rejouée.",
        reconciliation: { status: "partial", attestationMutationApplied: true, badgesMutationApplied: false, retryable: true },
      }, { status: 503 });
    }
    return handleApiError(error, "POST /api/spogomi/events/:eventId/recognition/attestations");
  }
}
