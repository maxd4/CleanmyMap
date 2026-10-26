import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBugReportScreenshotUploadIntent,
} from "@/lib/community/bug-report-screenshot";
import { bugReportScreenshotErrorResponse } from "../route-error";

export const runtime = "nodejs";
// Justification Vercel: l'intention d'upload dépend de l'identité Clerk, de l'état du feedback et d'un chemin Storage immuable généré à la demande.
export const dynamic = "force-dynamic";

const intentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().max(10000).nullable().optional(),
  height: z.number().int().positive().max(10000).nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse({ body: ["Le contenu de la requête est invalide."] });
  }
  const parsed = intentSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse({ screenshot: ["Les métadonnées de capture sont invalides."] });
  }

  try {
    const { reportId } = await context.params;
    const intent = await createBugReportScreenshotUploadIntent(
      getSupabaseServerClient(true),
      { ...parsed.data, userId: access.userId, feedbackId: reportId },
    );
    return NextResponse.json({ status: "ok", intent }, { status: 201 });
  } catch (error) {
    return bugReportScreenshotErrorResponse(error, "intent");
  }
}
