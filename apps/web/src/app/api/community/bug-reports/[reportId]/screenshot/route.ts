import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BugReportScreenshotError,
  cleanupBugReportScreenshotAttempt,
  deleteBugReportScreenshot,
  getBugReportScreenshot,
} from "@/lib/community/bug-report-screenshot";

export const runtime = "nodejs";
// Justification Vercel: la lecture et la suppression de la capture privée relisent l'état Storage/feedback à chaque requête et ne doivent pas être pré-rendues.
export const dynamic = "force-dynamic";

const cleanupSchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

function errorResponse(error: unknown) {
  if (error instanceof BugReportScreenshotError) {
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Capture introuvable." }, { status: 404 });
    }
    if (error.code === "validation") {
      return validationErrorResponse({ screenshot: [error.message] });
    }
  }
  return handleApiError(error, "community-bug-report-screenshot");
}

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
    return errorResponse(error);
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
    return errorResponse(error);
  }
}
