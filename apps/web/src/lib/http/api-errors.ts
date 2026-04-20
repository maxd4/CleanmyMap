import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Handle API errors in a centralized way.
 * Logs the error to console and returns a standardized JSON response.
 * This is the place to plug in Sentry or other monitoring tools.
 */
export function handleApiError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  
  // Basic logging
  console.error(`[API Error]${context ? ` in ${context}` : ""}:`, error);

  // Report to Sentry
  Sentry.captureException(error, {
    extra: { context, message }
  });

  return NextResponse.json(
    { 
      error: message,
      status: "error",
      context: context || "api_operation"
    },
    { status: 500 }
  );
}

/**
 * Specialized helper for Zod validation errors to avoid boilerplate in routes.
 */
export function validationErrorResponse(details: any, operationId?: string) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details,
      operationId,
    },
    { status: 400 }
  );
}
