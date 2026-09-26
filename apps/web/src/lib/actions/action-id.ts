export function normalizeActionId(actionId: string): string | null {
  const normalized = actionId.trim();
  return normalized.length > 0 ? normalized : null;
}
