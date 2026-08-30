const RELEASE_KEYS = ["SENTRY_RELEASE", "VERCEL_GIT_COMMIT_SHA", "GIT_COMMIT_SHA"];

function firstConfiguredValue(source, keys) {
  for (const key of keys) {
    const value = source[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function normalizeSentryRelease(value) {
  const normalized = value?.trim();
  return normalized || null;
}

export function resolveSentryRelease(source) {
  return normalizeSentryRelease(firstConfiguredValue(source, RELEASE_KEYS));
}

export function normalizeSentryEnvironment(value) {
  switch (value?.trim().toLowerCase()) {
    case "production":
    case "prod":
      return "production";
    case "preview":
      return "preview";
    case "development":
    case "dev":
    case "test":
      return "development";
    default:
      return "development";
  }
}

export function resolveSentryEnvironment(source) {
  return normalizeSentryEnvironment(
    firstConfiguredValue(source, ["SENTRY_ENVIRONMENT", "VERCEL_ENV", "NODE_ENV"]),
  );
}
