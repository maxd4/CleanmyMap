import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "@/lib/observability/sentry";

/**
 * User-friendly error messages (not exposed to client logs)
 */
const USER_ERROR_MESSAGES = {
  validation: "Certains champs doivent être corrigés avant de continuer.",
  auth: "Vous devez vous reconnecter pour continuer.",
  forbidden: "Vous n'avez pas accès à cette page.",
  notFound: "La ressource demandée est introuvable.",
  conflict: "La donnée a changé entre-temps. Rafraîchissez la page puis réessayez.",
  rateLimit: "Trop de requêtes. Réessayez dans quelques instants.",
  server: "Une erreur est survenue de notre côté. Réessayez dans quelques instants.",
  network: "Erreur de connexion. Vérifiez votre connexion internet.",
  unknown: "Une erreur inattendue est survenue. Réessayez.",
};

/**
 * Determine error category based on error type/message
 */
function categorizeError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (message.includes("validation") || message.includes("invalid") || message.includes("schema")) {
    return "validation";
  }
  if (message.includes("unauthorized") || message.includes("not authenticated") || message.includes("session")) {
    return "auth";
  }
  if (message.includes("forbidden") || message.includes("permission") || message.includes("access denied")) {
    return "forbidden";
  }
  if (message.includes("not found") || message.includes("does not exist")) {
    return "notFound";
  }
  if (message.includes("conflict") || message.includes("already exists")) {
    return "conflict";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "rateLimit";
  }
  
  return "server";
}

function statusFromCategory(category: string): number {
  switch (category) {
    case "validation":
      return 422;
    case "auth":
      return 401;
    case "forbidden":
      return 403;
    case "notFound":
      return 404;
    case "conflict":
      return 409;
    case "rateLimit":
      return 429;
    case "server":
    default:
      return 500;
  }
}

/**
 * Handle API errors in a centralized way.
 * - Logs detailed error to console (for debugging)
 * - Reports to Sentry if enabled (technical context)
 * - Returns generic user-friendly message to client (security)
 * - Includes a reference code for support correlation
 */
export function handleApiError(error: unknown, context?: string) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const category = categorizeError(error);
  const referenceCode = `ERR-${Date.now().toString(36).toUpperCase()}`;
  const status = statusFromCategory(category);
  
  // Detailed logging for debugging (not exposed to client)
  console.error(`[API Error] ${referenceCode}${context ? ` in ${context}` : ""}:`, {
    message: errorMessage,
    category,
    timestamp: new Date().toISOString(),
  });

  // Report to Sentry with full context for debugging
  if (isSentryEnabled()) {
    Sentry.captureException(error, {
      extra: { 
        context, 
        referenceCode,
        category,
        userSafe: false, // Flag to indicate this contains technical details
      }
    });
  }

  // Return generic user-friendly message with reference code for support
  return NextResponse.json(
    { 
      error: USER_ERROR_MESSAGES[category as keyof typeof USER_ERROR_MESSAGES] || USER_ERROR_MESSAGES.unknown,
      kind: category === "validation" ? "validation" : category === "auth" || category === "forbidden" ? "permission" : category === "rateLimit" ? "network" : "server",
      referenceCode, // Can be used by support to correlate with logs
      status: "error",
    },
    { status }
  );
}

/**
 * Specialized helper for Zod validation errors to avoid boilerplate in routes.
 */
export function validationErrorResponse(details: Record<string, string[]>) {
  const referenceCode = `VAL-${Date.now().toString(36).toUpperCase()}`;
  
  return NextResponse.json(
    {
      error: USER_ERROR_MESSAGES.validation,
      kind: "validation",
      referenceCode,
      details, // Zod validation details are safe to expose (they show what fields are invalid)
      status: "validation_error",
    },
    { status: 422 }
  );
}

/**
 * Handle unauthorized access attempts
 */
export function unauthorizedResponse(message?: string) {
  const referenceCode = `AUTH-${Date.now().toString(36).toUpperCase()}`;
  
  return NextResponse.json(
    {
      error: message || USER_ERROR_MESSAGES.auth,
      kind: "permission",
      referenceCode,
      status: "unauthorized",
    },
    { status: 401 }
  );
}

/**
 * Handle forbidden access attempts
 */
export function forbiddenResponse(message?: string) {
  const referenceCode = `FRB-${Date.now().toString(36).toUpperCase()}`;
  
  return NextResponse.json(
    {
      error: message || USER_ERROR_MESSAGES.forbidden,
      kind: "permission",
      referenceCode,
      status: "forbidden",
    },
    { status: 403 }
  );
}
