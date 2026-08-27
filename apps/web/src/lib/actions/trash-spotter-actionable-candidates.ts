import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import type { ActionMapItem } from "@/lib/actions/types";
import {
  getWasteCategory,
  isWasteCategorySlug,
  type WasteCategorySlug,
} from "@/lib/waste";

export const TRASH_SPOTTER_SOURCE = "trash_spotter_spots" as const;

export type TrashSpotterSpecializationReason =
  | "trained_only"
  | "no_pickup"
  | "missing_categories"
  | "unknown_categories";

export type TrashSpotterVolunteerEligibility =
  | "eligible"
  | "specialized_required";

export type TrashSpotterSafety = {
  volunteerEligibility: TrashSpotterVolunteerEligibility;
  specializationReason: TrashSpotterSpecializationReason | null;
};

export type TrashSpotterActionableCandidate = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  wasteCategories: WasteCategorySlug[];
  source: typeof TRASH_SPOTTER_SOURCE;
  sourceStatus: "validated";
  safety: TrashSpotterSafety;
  contract: ActionDataContract;
};

function isValidCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function resolveWasteCategories(
  categories: ActionDataContract["metadata"]["wasteCategories"],
): {
  categories: WasteCategorySlug[];
  hasUnknownCategory: boolean;
} {
  const rawCategories = Array.isArray(categories) ? categories : [];
  const validCategories = rawCategories.filter(
    (category): category is WasteCategorySlug =>
      typeof category === "string" && isWasteCategorySlug(category),
  );

  return {
    categories: [...new Set(validCategories)],
    hasUnknownCategory: validCategories.length !== rawCategories.length,
  };
}

export function classifyTrashSpotterSafety(
  categories: ActionDataContract["metadata"]["wasteCategories"],
): TrashSpotterSafety {
  const resolved = resolveWasteCategories(categories);

  // Absence or corruption of the category evidence is never treated as safe
  // for an ordinary volunteer route. The point can remain visible for future
  // specialized handling, but the route must not infer a pickup permission.
  if (resolved.categories.length === 0) {
    return {
      volunteerEligibility: "specialized_required",
      specializationReason: resolved.hasUnknownCategory
        ? "unknown_categories"
        : "missing_categories",
    };
  }

  if (resolved.hasUnknownCategory) {
    return {
      volunteerEligibility: "specialized_required",
      specializationReason: "unknown_categories",
    };
  }

  const policies = resolved.categories.map(
    (category) => getWasteCategory(category).pickupPolicy,
  );
  if (policies.includes("no_pickup")) {
    return {
      volunteerEligibility: "specialized_required",
      specializationReason: "no_pickup",
    };
  }
  if (policies.includes("trained_only")) {
    return {
      volunteerEligibility: "specialized_required",
      specializationReason: "trained_only",
    };
  }

  return {
    volunteerEligibility: "eligible",
    specializationReason: null,
  };
}

function toActionDataContract(
  item: ActionDataContract | ActionMapItem,
): ActionDataContract | null {
  if ("contract" in item && item.contract) {
    return item.contract as ActionDataContract;
  }
  if ("source" in item && "type" in item && "location" in item) {
    return item as ActionDataContract;
  }
  return null;
}

export function toTrashSpotterActionableCandidate(
  item: ActionDataContract | ActionMapItem,
): TrashSpotterActionableCandidate | null {
  const contract = toActionDataContract(item);
  if (!contract) {
    return null;
  }

  if (
    contract.source !== TRASH_SPOTTER_SOURCE ||
    contract.type !== "spot" ||
    contract.status !== "approved" ||
    contract.sourceStatus !== "validated"
  ) {
    return null;
  }

  const { latitude, longitude } = contract.location;
  if (!isValidCoordinatePair(latitude, longitude)) {
    return null;
  }

  const resolved = resolveWasteCategories(contract.metadata.wasteCategories);
  return {
    id: contract.id,
    label: contract.location.label,
    latitude,
    longitude: longitude as number,
    observedAt: contract.dates.observedAt,
    wasteCategories: resolved.categories,
    source: TRASH_SPOTTER_SOURCE,
    sourceStatus: "validated",
    safety: classifyTrashSpotterSafety(contract.metadata.wasteCategories),
    contract,
  };
}

export function buildTrashSpotterActionableCandidates(
  items: Array<ActionDataContract | ActionMapItem>,
): TrashSpotterActionableCandidate[] {
  return items
    .map(toTrashSpotterActionableCandidate)
    .filter(
      (candidate): candidate is TrashSpotterActionableCandidate =>
        candidate !== null,
    );
}

export function isTrashSpotterActionableItem(item: ActionMapItem): boolean {
  return toTrashSpotterActionableCandidate(item) !== null;
}

/**
 * Identifies canonical spot records so non-actionable statuses cannot leak
 * into the generic public marker layer. This intentionally does not include
 * canonical clean_place records, which remain a separate map entity.
 */
export function isTrashSpotterSpotRecord(
  item: ActionDataContract | ActionMapItem,
): boolean {
  const contract = toActionDataContract(item);
  return (
    contract?.source === TRASH_SPOTTER_SOURCE && contract.type === "spot"
  );
}

export function isVolunteerRouteEligible(
  candidate: TrashSpotterActionableCandidate,
): boolean {
  return candidate.safety.volunteerEligibility === "eligible";
}
