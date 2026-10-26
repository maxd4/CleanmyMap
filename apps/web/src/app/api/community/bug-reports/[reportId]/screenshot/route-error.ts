import { NextResponse } from "next/server";
import { forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { BugReportScreenshotError } from "@/lib/community/bug-report-screenshot";

type ScreenshotRoute = "intent" | "finalize" | "read-write";

export function bugReportScreenshotErrorResponse(
  error: unknown,
  route: ScreenshotRoute,
): Response {
  if (error instanceof BugReportScreenshotError) {
    if (error.code === "forbidden") return forbiddenJsonResponse();
    if (error.code === "not_found") {
      return NextResponse.json(
        { error: route === "intent" ? "Feedback introuvable." : "Capture introuvable." },
        { status: 404 },
      );
    }
    if (error.code === "validation") {
      return validationErrorResponse({ screenshot: [error.message] });
    }
    if (route === "finalize" && (error.code === "storage_missing" || error.code === "storage_invalid")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
  }
  return handleApiError(error, `community-bug-report-screenshot-${route}`);
}
