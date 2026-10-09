import {
  normalizeAccessibilityStatus,
  normalizePreparationChecklist,
  normalizeSuggestedMaterials,
} from "@/lib/actions/preparation-contract";
import type { FormState } from "./types";

function restorePreparationDraftField(
  next: FormState & Record<string, unknown>,
  key: string,
  value: unknown,
): boolean {
  if (key === "accessibilityStatus") {
    const normalized = normalizeAccessibilityStatus(value);
    if (normalized) next.accessibilityStatus = normalized;
    return true;
  }
  if (key === "suggestedMaterials") {
    const normalized = normalizeSuggestedMaterials(value);
    if (normalized) next.suggestedMaterials = normalized;
    return true;
  }
  if (key === "preparationChecklist") {
    const normalized = normalizePreparationChecklist(value);
    if (normalized) next.preparationChecklist = normalized;
    return true;
  }
  return false;
}

export function restoreDraftFields(
  next: FormState & Record<string, unknown>,
  parsed: Record<string, unknown>,
  keys: readonly string[],
): void {
  for (const key of keys) {
    const value = parsed[key];
    if (restorePreparationDraftField(next, key, value)) continue;
    if (key === "participantAccounts") {
      if (Array.isArray(value) && value.every((token) => typeof token === "string")) {
        next.participantAccounts = value;
      }
      continue;
    }
    if (key === "groupJoinEnabled" || key === "routeTargetDistanceKmManuallySet") {
      if (typeof value === "boolean") next[key] = value;
      continue;
    }
    if (typeof value === "string") next[key] = value;
  }
}
