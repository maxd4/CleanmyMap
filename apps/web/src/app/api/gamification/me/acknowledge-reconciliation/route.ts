import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";

export const runtime = "nodejs";

const acknowledgeReconciliationSchema = z.object({
  notificationId: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { userId } = access;

  try {
    const parsed = await parseJsonBodyWithValidation(request, acknowledgeReconciliationSchema);
    if (!parsed.ok) return parsed.response;
    const { notificationId } = parsed.data;

    const { error } = await getSupabaseServerClient(true)
      .from("app_notifications")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .eq("type", "gamification_reconciliation")
      .is("acknowledged_at", null);
    if (error) throw new Error(error.message);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/me/acknowledge-reconciliation");
  }
}
