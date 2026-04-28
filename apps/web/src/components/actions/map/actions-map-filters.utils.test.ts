import { describe, expect, it } from "vitest";
import {
  ACTIONS_MAP_FILTERS_STORAGE_KEY,
  buildDefaultActionsMapFilters,
  normalizeActionsMapFilters,
  readActionsMapFiltersFromStorage,
  writeActionsMapFiltersToStorage,
} from "./actions-map-filters.utils";

function buildStorage(seed: Record<string, string | null> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("actions map filters utils", () => {
  it("builds safe defaults", () => {
    const filters = buildDefaultActionsMapFilters(120);
    expect(filters.days).toBe(120);
    expect(filters.statusFilter).toBe("approved");
    expect(filters.impactFilter).toBe("all");
    expect(filters.qualityMin).toBe(0);
    expect(filters.visibleCategories.blue).toBe(true);
  });

  it("normalizes invalid persisted values", () => {
    const filters = normalizeActionsMapFilters(
      {
        days: 99999,
        statusFilter: "archived",
        impactFilter: "massif",
        qualityMin: -40,
        visibleCategories: { blue: false, unknown: false },
      },
      90,
    );

    expect(filters.days).toBe(3650);
    expect(filters.statusFilter).toBe("approved");
    expect(filters.impactFilter).toBe("all");
    expect(filters.qualityMin).toBe(0);
    expect(filters.visibleCategories.blue).toBe(false);
    expect(filters.visibleCategories.green).toBe(true);
  });

  it("reads defaults when storage is empty or invalid", () => {
    expect(readActionsMapFiltersFromStorage(buildStorage(), 30).days).toBe(30);
    expect(
      readActionsMapFiltersFromStorage(
        buildStorage({ [ACTIONS_MAP_FILTERS_STORAGE_KEY]: "not-json" }),
        45,
      ).days,
    ).toBe(45);
  });

  it("writes and reads filters from storage", () => {
    const storage = buildStorage();
    const filters = normalizeActionsMapFilters(
      {
        days: 3650,
        statusFilter: "all",
        impactFilter: "critique",
        qualityMin: 70,
        visibleCategories: { violet: false },
      },
      90,
    );

    writeActionsMapFiltersToStorage(storage, filters);

    expect(readActionsMapFiltersFromStorage(storage, 90)).toEqual(filters);
  });
});
