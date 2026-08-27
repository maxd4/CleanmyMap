import type { CreateActionPayload } from "../types";
import {
  appendWasteCategoriesToNotes,
  type WasteCategorySlug,
} from "@/lib/waste";

export type QuickSignalementRecordType = "spot" | "clean_place";

export function buildQuickSignalementPayload(params: {
  recordType: QuickSignalementRecordType;
  categories: readonly WasteCategorySlug[];
  location: { lat: number; lng: number };
  actionDate: string;
}): CreateActionPayload {
  const isSpot = params.recordType === "spot";
  const baseNotes = isSpot
    ? "Signalement mobile express"
    : "Lieu propre constaté via Signalement Rapide";

  return {
    actionDate: params.actionDate,
    locationLabel: isSpot
      ? `Signalement Rapide (${params.categories.join(", ")})`
      : "Lieu propre signalé",
    latitude: params.location.lat,
    longitude: params.location.lng,
    wasteKg: 0,
    cigaretteButts: 0,
    volunteersCount: 1,
    durationMinutes: 0,
    submissionMode: "quick",
    recordType: params.recordType,
    notes: isSpot
      ? appendWasteCategoriesToNotes(baseNotes, params.categories)
      : baseNotes,
    preparationData: isSpot
      ? { expectedWasteCategories: [...params.categories] }
      : null,
  };
}
