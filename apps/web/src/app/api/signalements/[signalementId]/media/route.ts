import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, forbiddenResponse } from "@/lib/http/api-errors";
import {
  listSignalementMedia,
  SignalementMediaError,
} from "@/lib/actions/signalement-media";

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
  _request: Request,
  context: { params: Promise<{ signalementId: string }> },
) {
  const { signalementId } = await context.params;
  try {
    const { userId } = await auth();
    const items = await listSignalementMedia(getSupabaseServerClient(), {
      signalementId,
      userId,
    });
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    return errorResponse(error);
  }
}
