type LogDetails = Record<string, unknown>;

function describeError(error: unknown): LogDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: String(error),
  };
}

export function logFailure(
  scope: string,
  message: string,
  error?: unknown,
  details?: LogDetails,
): void {
  const payload: LogDetails = {
    ...(details ?? {}),
    ...(error === undefined ? {} : { error: describeError(error) }),
  };

  if (Object.keys(payload).length === 0) {
    console.error(`[${scope}] ${message}`);
    return;
  }

  console.error(`[${scope}] ${message}`, payload);
}

export function logWarning(
  scope: string,
  message: string,
  details?: LogDetails,
): void {
  if (!details || Object.keys(details).length === 0) {
    console.warn(`[${scope}] ${message}`);
    return;
  }

  console.warn(`[${scope}] ${message}`, details);
}
