import { NextResponse } from "next/server";
import { getActionNeedOfferErrorCode } from "@/lib/community/action-need-offers";

export function actionNeedOfferMutationErrorResponse(error: unknown): NextResponse | null {
  const code = getActionNeedOfferErrorCode(error);
  if (code === "P0002") {
    return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  }
  if (code === "42501") {
    return NextResponse.json(
      { error: "Vous n'avez pas accès à cette offre ou ce besoin.", kind: "permission" },
      { status: 403 },
    );
  }
  if (code === "23505" || code === "40001" || code === "23514") {
    return NextResponse.json(
      { error: "L'offre a déjà été traitée ou le besoin n'est plus disponible.", kind: "conflict" },
      { status: 409 },
    );
  }
  if (code === "22023") {
    return NextResponse.json({ error: "Message d'offre invalide.", kind: "validation" }, { status: 422 });
  }
  return null;
}
