import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";

export const runtime = "nodejs";

// Vercel justification: this authenticated reconciliation route must read fresh mission and gamification state and must not be cached.
export const dynamic = "force-dynamic";

/**
 * PURPOSE: reconcile a completed linked mission from canonical contribution facts.
 * CALLER: the authenticated mobile mission owner, with a Clerk bearer context.
 * AUTHORIZATION_BOUNDARY: mission ownership and completion are checked server-side.
 * IDEMPOTENCY: the canonical reconciliation plan inserts at most one current event.
 * ATOMICITY: this handoff is independent of GPS contribution persistence.
 * FAILURE_BEHAVIOR: reconciliation errors return a retryable 500 and never roll back GPS facts.
 * SEARCH_PATH: delegated to the bounded Supabase server client and TypeScript owner.
 * GRANTS: no mission or GPS data is exposed; only the authenticated handoff result is returned.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ missionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { missionId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(missionId)) {
    return NextResponse.json({ error: "Mission invalide." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(true);
  const missionResult = await supabase
    .from("missions")
    .select("id, volunteer_id, action_id, status")
    .eq("id", missionId)
    .eq("volunteer_id", access.userId)
    .maybeSingle();
  if (missionResult.error) {
    return NextResponse.json({ error: "Impossible de vérifier la mission." }, { status: 500 });
  }
  const mission = missionResult.data as
    | { id: string; volunteer_id: string; action_id: string | null; status: string }
    | null;
  if (!mission || mission.status !== "completed" || !mission.action_id) {
    return NextResponse.json({ error: "Mission liée non finalisée." }, { status: 409 });
  }

  try {
    const reconciliation = await reconcileUserGamification(supabase, access.userId, {
      reasonCategory: "other",
    });
    return NextResponse.json({
      status: "ok",
      missionId: mission.id,
      actionId: mission.action_id,
      expectedEvents: reconciliation.expectedEvents,
    });
  } catch {
    return NextResponse.json({ error: "La réconciliation sera rejouée ultérieurement." }, { status: 500 });
  }
}
