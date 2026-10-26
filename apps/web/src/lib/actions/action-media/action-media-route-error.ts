import { NextResponse } from "next/server";
import { forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { ActionMediaError } from "./action-media";

const NOT_ADMISSIBLE_MEDIA_MESSAGE = "Les photos de bilan ne sont pas admissibles dans l'état actuel de l'action.";

type ActionMediaRouteOperation = "read" | "intent" | "finalize";

export function actionMediaErrorResponse(
  error: unknown,
  operation: ActionMediaRouteOperation,
) {
  if (error instanceof ActionMediaError) {
    if (error.code === "validation") return validationErrorResponse({ media: [error.message] });
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") {
      return NextResponse.json({ error: operation === "finalize" ? "Photo introuvable." : "Action introuvable." }, { status: 404 });
    }
    if (error.code === "not_admissible") {
      return NextResponse.json({
        error: NOT_ADMISSIBLE_MEDIA_MESSAGE,
        ...(operation === "finalize" || operation === "intent" ? { code: error.code } : {}),
      }, { status: 409 });
    }
    if (error.code === "limit_reached" || error.code === "conflict") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error.code === "storage_missing") {
      return NextResponse.json({
        error: operation === "finalize" ? "La photo n'a pas été reçue par le stockage." : error.message,
        code: error.code,
      }, { status: 422 });
    }
    if (error.code === "storage_invalid") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
  }

  return handleApiError(error, `action-media-${operation}`);
}
