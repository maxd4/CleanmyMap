import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: this is a private, recipient-bound projection whose
// actionable state must be read from the current action and notification rows.
export const dynamic = "force-dynamic";
// Cache/no-store justification: result prompts contain private recipient state
// and must never be served from a shared cache.

const decisionSchema = z.object({
  actionId: z.string().uuid(),
  decision: z.enum(["claim", "not_participated"]),
});

async function currentUserId(): Promise<string | null> {
  return (await auth()).userId;
}

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const userId = await currentUserId();
  if (!userId) return unauthorizedJsonResponse();

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "list_pending_action_result_prompts_for_recipient",
      { p_recipient_id: userId },
    );
    if (error) throw error;
    return NextResponse.json(
      { prompts: data ?? [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/post-action-prompts");
  }
}

export async function PATCH(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 10, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const userId = await currentUserId();
  if (!userId) return unauthorizedJsonResponse();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = decisionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const { data, error } = await getSupabaseServerClient(true).rpc(
      "respond_to_action_result_prompt",
      {
        p_action_id: parsed.data.actionId,
        p_recipient_id: userId,
        p_decision: parsed.data.decision,
      },
    );
    if (error) throw error;
    const result = (data ?? [])[0] as { status?: string; action_id?: string } | undefined;
    if (result?.status !== "claimed" && result?.status !== "declined" && result?.status !== "unavailable") {
      return NextResponse.json({ error: "État de sollicitation invalide." }, { status: 502 });
    }
    return NextResponse.json(
      {
        status: result.status,
        actionId: result.action_id ?? parsed.data.actionId,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/post-action-prompts");
  }
}
