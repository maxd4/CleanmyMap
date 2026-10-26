import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBugReportScreenshotUploadIntent,
} from "@/lib/community/bug-report-screenshot";
import { bugReportScreenshotErrorResponse, parseScreenshotJsonBody } from "../route-error";

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

  const parsed = await parseScreenshotJsonBody(request, intentSchema, "screenshot", "Les métadonnées de capture sont invalides.");
  if (parsed instanceof Response) return parsed;

  try {
    const { reportId } = await context.params;
    const intent = await createBugReportScreenshotUploadIntent(
      getSupabaseServerClient(true),
      { ...parsed, userId: access.userId, feedbackId: reportId },
    );
    return NextResponse.json({ status: "ok", intent }, { status: 201 });
  } catch (error) {
    return bugReportScreenshotErrorResponse(error, "intent");
  }
}
