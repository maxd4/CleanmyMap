const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:SECRET|SERVICE_ROLE|WEBHOOK|API_KEY|PRIVATE|PASSWORD|TOKEN)(?:_|$)/i;

export function isSensitiveEnvKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    return false;
  }

  if (key.startsWith("NEXT_PUBLIC_")) {
    return false;
  }

  return SENSITIVE_KEY_PATTERN.test(key);
}

export function filterSyncableEnvEntries(entries, { includeSecrets = false } = {}) {
  return [...entries].filter(([key, value]) => {
    if (!value || value.trim().length === 0) {
      return false;
    }

    if (!includeSecrets && isSensitiveEnvKey(key)) {
      return false;
    }

    return true;
  });
}
