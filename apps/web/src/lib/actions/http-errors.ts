import { AppError, type AppErrorKind, defaultMessageForKind } from "@/lib/errors/app-errors";

export function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function kindFromStatus(status: number): AppErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401 || status === 403) return "permission";
  if (status === 429) return "network";
  return "server";
}

export function createActionError(
  response: Response,
  payload: unknown,
  fallback: string,
): AppError {
  const kind = kindFromStatus(response.status);
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  return new AppError({
    kind,
    message: parseErrorMessage(body, fallback || defaultMessageForKind(kind)),
    status: response.status,
    code: typeof body?.["code"] === "string" ? String(body["code"]) : undefined,
    referenceCode:
      typeof body?.["referenceCode"] === "string" ? String(body["referenceCode"]) : undefined,
    retryable: kind === "network" || kind === "server",
    details:
      body?.["details"] && typeof body["details"] === "object"
        ? (body["details"] as Record<string, unknown>)
        : undefined,
  });
}

export async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
