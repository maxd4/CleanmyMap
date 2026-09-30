import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "@/lib/gamification/progression-types";

export const runtime = "nodejs";

export async function POST() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { userId } = access;

  try {
    const supabase = getSupabaseServerClient(true);
    const now = new Date().toISOString();
    const currentProfile = await supabase
      .from("progression_profiles")
      .select("current_applied_rules_revision")
      .eq("user_id", userId)
      .maybeSingle();
    if (currentProfile.error) throw new Error(currentProfile.error.message);

    const appliedRevisionValue = Number(
      (currentProfile.data as { current_applied_rules_revision?: number | null } | null)
        ?.current_applied_rules_revision,
    );
    const currentAppliedRulesRevision = Number.isFinite(appliedRevisionValue) && appliedRevisionValue >= 0
      ? Math.trunc(appliedRevisionValue)
      : 0;
    const acknowledgedRulesRevision = Math.min(
      currentAppliedRulesRevision,
      CURRENT_GAMIFICATION_RULES_REVISION,
    );
    const profile = await supabase.from("progression_profiles").upsert(
      {
        user_id: userId,
        last_acknowledged_rules_revision: acknowledgedRulesRevision,
      },
      { onConflict: "user_id" },
    );
    if (profile.error) throw new Error(profile.error.message);

    const notifications = await supabase
      .from("app_notifications")
      .update({ acknowledged_at: now })
      .eq("user_id", userId)
      .eq("type", "gamification_reconciliation")
      .is("acknowledged_at", null);
    if (notifications.error) throw new Error(notifications.error.message);

    return NextResponse.json({
      status: "ok",
      rulesRevision: acknowledgedRulesRevision,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/me/acknowledge-rules-migration");
  }
}
