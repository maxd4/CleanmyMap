import { logFailure } from "@/lib/logging/failure-log";

export type ProgressionEventWriteClassification =
  | "duplicate"
  | "retryable"
  | "blocking";

export type ProgressionEventWriteMode = "strict" | "best_effort";

export type ProgressionEventWriteResult =
  | {
      inserted: true;
      duplicate: false;
      attempts: number;
    }
  | {
      inserted: false;
      duplicate: true;
      attempts: number;
    }
  | {
      inserted: false;
      duplicate: false;
      attempts: number;
      error: unknown;
      classification: ProgressionEventWriteClassification;
    };

export type ProgressionEventWritePolicy = {
  mode?: ProgressionEventWriteMode;
  maxAttempts?: number;
  retryDelaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
  logger?: (message: string, details?: Record<string, unknown>) => void;
};

const RETRYABLE_CODES = new Set([
  "40001",
  "40P01",
  "53P01",
  "55P03",
  "57P01",
  "57014",
  "08000",
  "08003",
  "08006",
  "08001",
  "08S01",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.trim().length > 0 ? code : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return String(error);
}

export function classifyProgressionEventWriteError(
  error: unknown,
): ProgressionEventWriteClassification {
  const code = getErrorCode(error);
  if (code === "23505") {
    return "duplicate";
  }

  if (code && RETRYABLE_CODES.has(code)) {
    return "retryable";
  }

  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes("timeout") ||
    message.includes("temporar") ||
    message.includes("connection reset") ||
    message.includes("connection refused") ||
    message.includes("too many connections")
  ) {
    return "retryable";
  }

  return "blocking";
}

export function shouldRetryProgressionEventWriteError(error: unknown): boolean {
  return classifyProgressionEventWriteError(error) === "retryable";
}

export function shouldIgnoreProgressionEventWriteError(error: unknown): boolean {
  return classifyProgressionEventWriteError(error) === "duplicate";
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultLogger(message: string, details?: Record<string, unknown>): void {
  logFailure("Gamification/ProgressionEvents", message, undefined, details);
}

function isErrorLike(result: unknown): result is { error?: unknown } {
  return Boolean(result && typeof result === "object" && "error" in result);
}

export async function writeProgressionEventWithPolicy<T extends { error?: unknown }>(
  operation: () => Promise<T>,
  policy: ProgressionEventWritePolicy = {},
): Promise<ProgressionEventWriteResult> {
  const mode = policy.mode ?? "strict";
  const maxAttempts = Math.max(1, Math.trunc(policy.maxAttempts ?? 3));
  const retryDelaysMs = policy.retryDelaysMs ?? [50, 150, 400];
  const sleep = policy.sleep ?? defaultSleep;
  const logger = policy.logger ?? defaultLogger;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await operation();
    if (!isErrorLike(result)) {
      return {
        inserted: true,
        duplicate: false,
        attempts: attempt,
      };
    }

    const error = result.error;
    if (!error) {
      return {
        inserted: true,
        duplicate: false,
        attempts: attempt,
      };
    }

    const classification = classifyProgressionEventWriteError(error);
    if (classification === "duplicate") {
      return {
        inserted: false,
        duplicate: true,
        attempts: attempt,
      };
    }

    lastError = error;
    if (classification === "retryable" && attempt < maxAttempts) {
      const delay = retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 0;
      if (delay > 0) {
        await sleep(delay);
      }
      continue;
    }

    logger("Progression event write failed", {
      classification,
      mode,
      attempts: attempt,
      error: error instanceof Error ? error.message : String(error),
    });

    if (mode === "best_effort") {
      return {
        inserted: false,
        duplicate: false,
        attempts: attempt,
        error,
        classification,
      };
    }

    throw error instanceof Error ? error : new Error(String(error));
  }

  const classification = lastError ? classifyProgressionEventWriteError(lastError) : "blocking";
  logger("Progression event write exhausted retries", {
    classification,
    mode,
    attempts: maxAttempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  if (mode === "best_effort") {
    return {
      inserted: false,
      duplicate: false,
      attempts: maxAttempts,
      error: lastError ?? new Error("Progression event write failed"),
      classification,
    };
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Progression event write failed"));
}
