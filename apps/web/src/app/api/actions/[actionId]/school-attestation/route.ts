import { NextResponse } from "next/server";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildSchoolActionAttestation,
  isEligibleForSchoolActionRecognition,
} from "@/lib/gamification/school-action-recognition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public, bounded projection: no student identity, notes, quiz result, or photo is returned. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ actionId: string }> },
): Promise<Response> {
  const { actionId: rawActionId } = await context.params;
  const actionId = rawActionId.trim();
  if (!UUID_PATTERN.test(actionId)) {
    return NextResponse.json({ error: "Identifiant d’action invalide." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(true);
  const action = await loadActionById(supabase, actionId);
  if (
    !action ||
    action.status !== "approved" ||
    action.action_phase !== "post_action_complete" ||
    !action.published_at ||
    action.moderation_visibility !== "visible" ||
    action.access_mode !== "public"
  ) {
    return NextResponse.json({ error: "Attestation indisponible." }, { status: 404 });
  }

  const canonicalOrganizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  if (!isEligibleForSchoolActionRecognition(action, canonicalOrganizerIds)) {
    return NextResponse.json({ error: "Attestation indisponible." }, { status: 404 });
  }
  const attestation = buildSchoolActionAttestation({ action, canonicalOrganizerIds });
  if (attestation.status !== "eligible") {
    return NextResponse.json({ error: "Cette action ne remplit pas le cadre scolaire confirmé." }, { status: 404 });
  }

  return NextResponse.json(
    { attestation },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
