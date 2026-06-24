import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";

type PointsLedgerRow = {
  id: string;
  transaction_type: string;
  amount: number;
  reason: string | null;
  source_event: string | null;
  source_id: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam) || 50, 200) : 50;

  try {
    const supabase = getSupabaseServerClient();

    // Fetch points ledger history
    const { data, error } = await supabase
      .from("points_ledger")
      .select(
        "id, transaction_type, amount, reason, source_event, source_id, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return handleApiError(error, "GET /api/gamification/points/history");
    }

    return NextResponse.json({
      status: "ok",
      entries: (data ?? []).map((row: PointsLedgerRow) => ({
        id: row.id,
        transactionType: row.transaction_type,
        amount: row.amount,
        reason: row.reason,
        sourceEvent: row.source_event,
        sourceId: row.source_id,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/points/history");
  }
}
