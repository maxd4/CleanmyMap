import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTION_NEED_OFFER_MESSAGE_MAX_LENGTH,
  createActionNeedOffer,
  listActionNeedOffers,
  toActionNeedOfferItem,
} from "@/lib/community/action-need-offers";
import {
  canManageActionNeed,
  loadActionNeedById,
} from "@/lib/community/action-needs-service";
import { actionNeedOfferMutationErrorResponse } from "./route.shared";

export const runtime = "nodejs";
// Vercel contract: need offers require a dynamic authorization-aware response.
export const dynamic = "force-dynamic";

const offerIdSchema = z.string().uuid();
const createOfferSchema = z.object({
  message: z.string().trim().max(ACTION_NEED_OFFER_MESSAGE_MAX_LENGTH).nullable().optional(),
}).strict();

function invalidNeedIdResponse() {
  return NextResponse.json({ error: "Identifiant de besoin invalide." }, { status: 400 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ needId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { needId } = await context.params;
  if (!offerIdSchema.safeParse(needId).success) return invalidNeedIdResponse();

  try {
    const supabase = getSupabaseServerClient(true);
    const contextRow = await loadActionNeedById(supabase, needId);
    if (!contextRow) return NextResponse.json({ error: "Besoin introuvable." }, { status: 404 });

    const isManager = await canManageActionNeed(supabase, access.userId, contextRow.action);
    const rows = await listActionNeedOffers(supabase, needId, access.userId, isManager);
    if (!isManager && rows.length === 0) {
      return NextResponse.json(
        { error: "Vous n'avez pas accès aux offres de ce besoin.", kind: "permission" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      status: "ok",
      items: rows.map((row) => toActionNeedOfferItem(row, isManager)),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/community/needs/[needId]/offers");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ needId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { needId } = await context.params;
  if (!offerIdSchema.safeParse(needId).success) return invalidNeedIdResponse();
  const parsed = await parseJsonBodyWithValidation(request, createOfferSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createActionNeedOffer(
      getSupabaseServerClient(true),
      needId,
      access.userId,
      parsed.data.message ?? null,
    );
    return NextResponse.json({
      status: "created",
      item: toActionNeedOfferItem(result.offer),
    }, { status: 201 });
  } catch (error) {
    return actionNeedOfferMutationErrorResponse(error) ?? handleApiError(
      error,
      "POST /api/community/needs/[needId]/offers",
    );
  }
}
