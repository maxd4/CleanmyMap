import { NextResponse } from "next/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BugReportScreenshotError,
  finalizeBugReportScreenshot,
} from "@/lib/community/bug-report-screenshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof BugReportScreenshotError) {
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") {
      return NextResponse.json({ error: "Capture introuvable." }, { status: 404 });
    }
    if (error.code === "storage_missing" || error.code === "storage_invalid") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
  }
  return handleApiError(error, "community-bug-report-screenshot-finalize");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { reportId } = await context.params;
    const result = await finalizeBugReportScreenshot(getSupabaseServerClient(true), {
      userId: access.userId,
      feedbackId: reportId,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
