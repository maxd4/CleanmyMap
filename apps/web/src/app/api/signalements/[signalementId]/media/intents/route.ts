import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import {
  createSignalementMediaUploadIntent,
  SignalementMediaError,
} from "@/lib/actions/signalement-media";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Justification Vercel: l'intention varie selon la session Clerk et le quota média du signalement.
export const dynamic = "force-dynamic";

const intentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().max(10000).nullable().optional(),
  height: z.number().int().positive().max(10000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(2).optional(),
  clientUploadId: z.string().trim().min(1).max(128),
});

function errorResponse(error: unknown) {
  if (error instanceof SignalementMediaError) {
    if (error.code === "validation") {
      return validationErrorResponse({ media: [error.message] });
    }
    if (error.code === "forbidden") {
      return forbiddenJsonResponse();
    }
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Signalement introuvable." }, { status: 404 });
    }
    if (error.code === "limit_reached") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
  }
  return handleApiError(error, "signalement-media-intent");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ signalementId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { signalementId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse({ body: ["Le contenu de la requête est invalide."] });
  }
  const parsed = intentSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse({ media: ["Les métadonnées photo sont invalides."] });
  }

  try {
    const intent = await createSignalementMediaUploadIntent(getSupabaseServerClient(), {
      ...parsed.data,
      userId: access.userId,
      signalementId,
    });
    return NextResponse.json({ status: "ok", intent }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
