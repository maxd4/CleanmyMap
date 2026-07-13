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

type ProgressionEventWriteAttemptOutcome =
  | {
      kind: "inserted";
      result: ProgressionEventWriteResult;
    }
  | {
      kind: "retry";
      error: unknown;
      delayMs: number;
    }
  | {
      kind: "failed";
      result: ProgressionEventWriteResult;
    }
  | {
      kind: "throw";
      error: Error;
    };

function buildInsertedProgressionEventWriteResult(
  attempts: number,
): ProgressionEventWriteResult {
  return {
    inserted: true,
    duplicate: false,
    attempts,
  };
}

function buildDuplicateProgressionEventWriteResult(
  attempts: number,
): ProgressionEventWriteResult {
  return {
    inserted: false,
    duplicate: true,
    attempts,
  };
}

function buildProgressionEventWriteFailureResult(
  attempts: number,
  error: unknown,
  classification: ProgressionEventWriteClassification,
): ProgressionEventWriteResult {
  return {
    inserted: false,
    duplicate: false,
    attempts,
    error,
    classification,
  };
}

function getRetryDelay(retryDelaysMs: number[], attempt: number): number {
  return (
    retryDelaysMs[Math.min(attempt - 1, retryDelaysMs.length - 1)] ??
    retryDelaysMs[retryDelaysMs.length - 1] ??
    0
  );
}

function logProgressionEventWriteFailure(
  logger: (message: string, details?: Record<string, unknown>) => void,
  classification: ProgressionEventWriteClassification,
  mode: ProgressionEventWriteMode,
  attempts: number,
  error: unknown,
): void {
  logger("Progression event write failed", {
    classification,
    mode,
    attempts,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function sleepIfNeeded(
  sleep: (ms: number) => Promise<void>,
  delayMs: number,
): Promise<void> {
  if (delayMs > 0) {
    await sleep(delayMs);
  }
}

function handleProgressionEventWriteExhaustion(
  lastError: unknown,
  mode: ProgressionEventWriteMode,
  maxAttempts: number,
  logger: (message: string, details?: Record<string, unknown>) => void,
): ProgressionEventWriteResult {
  const classification = lastError
    ? classifyProgressionEventWriteError(lastError)
    : "blocking";

  logProgressionEventWriteFailure(
    logger,
    classification,
    mode,
    maxAttempts,
    lastError,
  );

  if (mode === "best_effort") {
    return buildProgressionEventWriteFailureResult(
      maxAttempts,
      lastError ?? new Error("Progression event write failed"),
      classification,
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Progression event write failed"));
}

async function handleProgressionEventWriteAttempt<T extends { error?: unknown }>(params: {
  operation: () => Promise<T>;
  attempt: number;
  maxAttempts: number;
  mode: ProgressionEventWriteMode;
  retryDelaysMs: number[];
  logger: (message: string, details?: Record<string, unknown>) => void;
}): Promise<ProgressionEventWriteAttemptOutcome> {
  const { operation, attempt, maxAttempts, mode, retryDelaysMs, logger } = params;
  const result = await operation();

  if (!isErrorLike(result) || !result.error) {
    return {
      kind: "inserted",
      result: buildInsertedProgressionEventWriteResult(attempt),
    };
  }

  const error = result.error;
  const classification = classifyProgressionEventWriteError(error);

  if (classification === "duplicate") {
    return {
      kind: "inserted",
      result: buildDuplicateProgressionEventWriteResult(attempt),
    };
  }

  if (classification === "retryable" && attempt < maxAttempts) {
    return {
      kind: "retry",
      error,
      delayMs: getRetryDelay(retryDelaysMs, attempt),
    };
  }

  logProgressionEventWriteFailure(logger, classification, mode, attempt, error);

  if (mode === "best_effort") {
    return {
      kind: "failed",
      result: buildProgressionEventWriteFailureResult(
        attempt,
        error,
        classification,
      ),
    };
  }

  return {
    kind: "throw",
    error: error instanceof Error ? error : new Error(String(error)),
  };
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
    const outcome = await handleProgressionEventWriteAttempt({
      operation,
      attempt,
      maxAttempts,
      mode,
      retryDelaysMs,
      logger,
    });

    switch (outcome.kind) {
      case "inserted":
        return outcome.result;
      case "retry":
        lastError = outcome.error;
        await sleepIfNeeded(sleep, outcome.delayMs);
        continue;
      case "failed":
        return outcome.result;
      case "throw":
        throw outcome.error;
    }
  }

  return handleProgressionEventWriteExhaustion(
    lastError,
    mode,
    maxAttempts,
    logger,
  );
}
