import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  finalizeBugReportScreenshot,
} from "@/lib/community/bug-report-screenshot";
import { bugReportScreenshotErrorResponse, parseScreenshotJsonBody } from "../route-error";

export const runtime = "nodejs";
// Justification Vercel: la finalisation vérifie les octets privés dans Storage et effectue une transition conditionnelle du feedback à chaque appel.
export const dynamic = "force-dynamic";

const finalizeSchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const parsed = await parseScreenshotJsonBody(request, finalizeSchema, "screenshot", "La tentative de capture est invalide.");
  if (parsed instanceof Response) return parsed;

  try {
    const { reportId } = await context.params;
    const result = await finalizeBugReportScreenshot(getSupabaseServerClient(true), {
      userId: access.userId,
      feedbackId: reportId,
      attemptId: parsed.attemptId,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    return bugReportScreenshotErrorResponse(error, "finalize");
  }
}
