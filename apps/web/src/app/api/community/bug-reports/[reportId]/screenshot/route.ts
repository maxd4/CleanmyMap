import { NextResponse } from "next/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BugReportScreenshotError,
  deleteBugReportScreenshot,
  getBugReportScreenshot,
} from "@/lib/community/bug-report-screenshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof BugReportScreenshotError) {
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Capture introuvable." }, { status: 404 });
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
    await deleteBugReportScreenshot(getSupabaseServerClient(true), {
      userId: access.userId,
      feedbackId: reportId,
    });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return errorResponse(error);
  }
}
