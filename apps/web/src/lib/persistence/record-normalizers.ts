export function normalizeTextField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeOptionalTextField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
