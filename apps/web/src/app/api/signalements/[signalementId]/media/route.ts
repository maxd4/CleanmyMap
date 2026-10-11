import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, forbiddenResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  listSignalementMedia,
  SignalementMediaError,
} from "@/lib/actions/signalement/signalement-media";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";

export const runtime = "nodejs";
// Justification Vercel: les URLs signées dépendent de la session, du statut du parent et de Storage.
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof SignalementMediaError && error.code === "forbidden") {
    return forbiddenResponse();
  }
  if (error instanceof SignalementMediaError && error.code === "not_found") {
    return NextResponse.json({ error: "Signalement introuvable." }, { status: 404 });
  }
  return handleApiError(error, "signalement-media-list");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ signalementId: string }> },
) {
  const { signalementId } = await context.params;
  try {
    const access = await requireActionRequestAccess(request);
    if (!access.ok) return unauthorizedJsonResponse();
    const { userId } = access;
    const items = await listSignalementMedia(getSupabaseServerClient(true), {
      signalementId,
      userId,
    });
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    return errorResponse(error);
  }
}
