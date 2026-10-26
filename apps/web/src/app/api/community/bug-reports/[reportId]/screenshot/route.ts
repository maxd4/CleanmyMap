import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  cleanupBugReportScreenshotAttempt,
  deleteBugReportScreenshot,
  getBugReportScreenshot,
} from "@/lib/community/bug-report-screenshot";
import { bugReportScreenshotErrorResponse } from "./route-error";

export const runtime = "nodejs";
// Justification Vercel: la lecture et la suppression de la capture privée relisent l'état Storage/feedback à chaque requête et ne doivent pas être pré-rendues.
export const dynamic = "force-dynamic";

const cleanupSchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { reportId } = await context.params;
    const screenshot = await getBugReportScreenshot(getSupabaseServerClient(true), {
      userId: access.userId,
      feedbackId: reportId,
    });
    return NextResponse.json(
      { status: "ok", screenshot },
      // Justification Vercel: l'URL signée est privée, courte et liée à l'état courant ; elle ne doit jamais être servie depuis un cache.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return bugReportScreenshotErrorResponse(error, "read-write");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { reportId } = await context.params;
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      await deleteBugReportScreenshot(getSupabaseServerClient(true), {
        userId: access.userId,
        feedbackId: reportId,
      });
    } else {
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return validationErrorResponse({ body: ["Le contenu de la requête est invalide."] });
      }
      const parsed = cleanupSchema.safeParse(body);
      if (!parsed.success) {
        return validationErrorResponse({ screenshot: ["La tentative de capture est invalide."] });
      }
      await cleanupBugReportScreenshotAttempt(getSupabaseServerClient(true), {
        userId: access.userId,
        feedbackId: reportId,
        attemptId: parsed.data.attemptId,
      });
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return bugReportScreenshotErrorResponse(error, "read-write");
  }
}
