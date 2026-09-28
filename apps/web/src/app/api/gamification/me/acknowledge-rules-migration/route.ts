import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "@/lib/gamification/progression-types";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const supabase = getSupabaseServerClient(true);
    const now = new Date().toISOString();
    const profile = await supabase.from("progression_profiles").upsert(
      {
        user_id: userId,
        current_applied_rules_revision: CURRENT_GAMIFICATION_RULES_REVISION,
        last_acknowledged_rules_revision: CURRENT_GAMIFICATION_RULES_REVISION,
        updated_at: now,
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
      rulesRevision: CURRENT_GAMIFICATION_RULES_REVISION,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/me/acknowledge-rules-migration");
  }
}
