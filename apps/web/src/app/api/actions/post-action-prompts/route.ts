import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isActionResultPromptDecisionRow,
  isPendingActionResultPromptRow,
} from "@/lib/actions/runtime-contracts";
import {
  parseActionRows,
  parseActionSingleRow,
  parseActionSupabaseResult,
} from "@/lib/actions/query";

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
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "list_pending_action_result_prompts_for_recipient",
      { p_recipient_id: userId },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const prompts = result.data === null ? [] : parseActionRows(result.data, isPendingActionResultPromptRow);
    if (!prompts) throw new Error("La réponse des sollicitations est invalide.");
    return NextResponse.json(
      { prompts },
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
    const rawResult: unknown = await getSupabaseServerClient(true).rpc(
      "respond_to_action_result_prompt",
      {
        p_action_id: parsed.data.actionId,
        p_recipient_id: userId,
        p_decision: parsed.data.decision,
      },
    );
    const result = parseActionSupabaseResult(rawResult);
    if (result.error) throw result.error;
    const decision = parseActionSingleRow(result.data, isActionResultPromptDecisionRow);
    if (!decision) {
      return NextResponse.json({ error: "État de sollicitation invalide." }, { status: 502 });
    }
    return NextResponse.json(
      {
        status: decision.status,
        actionId: decision.action_id,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/post-action-prompts");
  }
}
