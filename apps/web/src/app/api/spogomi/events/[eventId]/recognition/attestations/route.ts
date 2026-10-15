import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { getSpogomiRecognitionPartialDetails, reconcileSpogomiRecognition } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";

const inputSchema = z.object({
  participantId: z.string().uuid(),
  kind: z.enum(["collector", "referee", "organizer", "finish_control", "field_safety", "weighing_sorting", "logistics_support"]),
  status: z.enum(["certified", "revoked"]),
  evidenceReference: z.string().trim().min(1).max(500),
  certificationVersion: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(1000).nullable().optional(),
  divisionId: z.string().uuid().optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  let attestationMutationApplied = false;
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    const { event } = authorized;
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Attestation SPOGOMI invalide." }, { status: 400 });
    const rpcName = parsed.data.divisionId ? "set_spogomi_recognition_attestation_for_division" : "set_spogomi_recognition_attestation";
    const result = await supabase.rpc(rpcName, {
      p_event_id: eventId, p_participant_id: parsed.data.participantId, p_kind: parsed.data.kind, p_status: parsed.data.status,
      p_evidence_reference: parsed.data.evidenceReference, p_certification_version: parsed.data.certificationVersion,
      p_actor_clerk_id: access.userId, p_reason: parsed.data.reason ?? null,
      ...(parsed.data.divisionId ? { p_division_id: parsed.data.divisionId } : {}),
    });
    if (result.error) throw result.error;
    attestationMutationApplied = true;
    const reconciliation = event.state === "certified"
      ? await reconcileSpogomiRecognition({ supabase, eventId, actorClerkId: access.userId })
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
