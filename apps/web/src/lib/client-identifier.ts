let fallbackSequence = 0;

export function createClientIdentifier(prefix = ""): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    const value = randomUUID.call(globalThis.crypto);
    return prefix ? `${prefix}-${value}` : value;
  }

  fallbackSequence = fallbackSequence >= Number.MAX_SAFE_INTEGER ? 1 : fallbackSequence + 1;
  const value = `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
  return prefix ? `${prefix}-${value}` : value;
}
