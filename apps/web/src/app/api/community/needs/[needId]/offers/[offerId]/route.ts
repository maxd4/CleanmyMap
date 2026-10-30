import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTION_NEED_OFFER_OPERATIONS,
  toActionNeedOfferItem,
  transitionActionNeedOffer,
} from "@/lib/community/action-need-offers";
import { actionNeedOfferMutationErrorResponse } from "../route.shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();
const patchOfferSchema = z.object({
  operation: z.enum(ACTION_NEED_OFFER_OPERATIONS),
}).strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ needId: string; offerId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const { needId, offerId } = await context.params;
  if (!idSchema.safeParse(needId).success || !idSchema.safeParse(offerId).success) {
    return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });
  }
  const parsed = await parseJsonBodyWithValidation(request, patchOfferSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await transitionActionNeedOffer(
      getSupabaseServerClient(true),
      offerId,
      access.userId,
      parsed.data.operation,
    );
    if (result.offer.need_id !== needId) {
      return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    }
    return NextResponse.json({
      status: "updated",
      item: toActionNeedOfferItem(result.offer),
    });
  } catch (error) {
    return actionNeedOfferMutationErrorResponse(error) ?? handleApiError(
      error,
      "PATCH /api/community/needs/[needId]/offers/[offerId]",
    );
  }
}
