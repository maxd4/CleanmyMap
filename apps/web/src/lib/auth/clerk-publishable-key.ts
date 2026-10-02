export function decodeClerkPublishableKeyPayload(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  const payload = raw.trim().replace(/^pk_(?:test|live)_/, "").replace(/\$$/, "");
  if (!payload) {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded).trim().replace(/\$$/, "");
  } catch {
    return undefined;
  }
}
