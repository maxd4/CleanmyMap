import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const body = await request.json().catch(() => null);
    const notificationId =
      body && typeof body === "object" && "notificationId" in body
        ? (body as { notificationId?: unknown }).notificationId
        : null;
    if (typeof notificationId !== "string" || notificationId.length === 0) {
      return NextResponse.json({ error: "notificationId requis." }, { status: 400 });
    }

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
