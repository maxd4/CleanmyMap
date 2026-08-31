import type { WasteCategorySlug } from "@/lib/waste";
import type { QuickSignalementRecordType } from "./quick-signalement";

export type QuickSignalementDraft = {
  recordType?: QuickSignalementRecordType;
  selectedCategories?: WasteCategorySlug[];
};

/**
 * Reads only the non-sensitive part of a pending draft.
 * Older drafts may still contain coordinates; they are deliberately ignored.
 */
export function parseQuickSignalementDraft(rawDraft: string): QuickSignalementDraft | null {
  try {
    const candidate = JSON.parse(rawDraft) as {
      recordType?: unknown;
      selectedCategories?: unknown;
    };
    const draft: QuickSignalementDraft = {};

    if (candidate.recordType === "spot" || candidate.recordType === "clean_place") {
      draft.recordType = candidate.recordType;
    }
    if (Array.isArray(candidate.selectedCategories)) {
      draft.selectedCategories = candidate.selectedCategories as WasteCategorySlug[];
    }

    return Object.keys(draft).length > 0 ? draft : null;
  } catch {
    return null;
  }
}

export function serializeQuickSignalementDraft(draft: QuickSignalementDraft): string {
  return JSON.stringify({
    ...(draft.recordType ? { recordType: draft.recordType } : {}),
    ...(draft.selectedCategories ? { selectedCategories: draft.selectedCategories } : {}),
  });
}
