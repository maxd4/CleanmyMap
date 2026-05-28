import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";

export const runtime = "nodejs";

const addPointsSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive integer"),
  reason: z.string().optional(),
  sourceEvent: z.string().optional(),
  sourceId: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parsed = addPointsSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient();

    // Insert ledger entry
    const { data, error } = await supabase
      .from("points_ledger")
      .insert({
        user_id: userId,
        transaction_type: "earned",
        amount: parsed.data.amount,
        reason: parsed.data.reason ?? null,
        source_event: parsed.data.sourceEvent ?? null,
        source_id: parsed.data.sourceId ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return handleApiError(error, "POST /api/gamification/points/add");
    }

    // Fetch updated points
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("total_points, earned_points, spent_points")
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json(
      {
        status: "ok",
        ledgerId: data.id,
        points: pointsData ?? {
          total_points: parsed.data.amount,
          earned_points: parsed.data.amount,
          spent_points: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/points/add");
  }
}
