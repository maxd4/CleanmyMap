import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import {
  ACTIONS_MAP_FILTERS_STORAGE_KEY,
  buildDefaultActionsMapFilters,
  matchesZoneQuery,
  normalizeActionsMapFilters,
  normalizeZoneQuery,
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

function buildMapItem(overrides: Partial<ActionMapItem> = {}): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-03",
    location_label: "Lieu test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    created_by_clerk_id: null,
    ...overrides,
  };
}

describe("actions map filters utils", () => {
  it("builds safe defaults", () => {
    const filters = buildDefaultActionsMapFilters(120);
    expect(filters.days).toBe(120);
    expect(filters.dateScope).toBe("current_year");
    expect(filters.statusFilter).toBe("approved");
    expect(filters.impactFilter).toBe("all");
    expect(filters.qualityMin).toBe(0);
    expect(filters.zoneQuery).toBe("");
    expect(filters.visibleCategories.blue).toBe(true);
  });

  it("normalizes invalid persisted values", () => {
    const filters = normalizeActionsMapFilters(
      {
        days: 99999,
        statusFilter: "archived",
        impactFilter: "massif",
        qualityMin: -40,
        zoneQuery: "  République   ",
        visibleCategories: { blue: false, unknown: false },
      },
      90,
    );

    expect(filters.days).toBe(90);
    expect(filters.dateScope).toBe("all_time");
    expect(filters.statusFilter).toBe("approved");
    expect(filters.impactFilter).toBe("all");
    expect(filters.qualityMin).toBe(0);
    expect(filters.zoneQuery).toBe("République");
    expect(filters.visibleCategories.blue).toBe(false);
    expect(filters.visibleCategories.green).toBe(true);
  });

  it("normalizes explicit time scope values", () => {
    const allTime = normalizeActionsMapFilters(
      { dateScope: "all_time", days: 24 },
      90,
    );
    expect(allTime.dateScope).toBe("all_time");
    expect(allTime.days).toBe(90);

    const currentYear = normalizeActionsMapFilters(
      { dateScope: "current_year", days: 24 },
      90,
    );
    expect(currentYear.dateScope).toBe("current_year");
    expect(currentYear.days).toBe(90);
  });

  it("normalizes legacy all or rejected status filters to approved", () => {
    expect(
      normalizeActionsMapFilters({ statusFilter: "all" }, 90).statusFilter,
    ).toBe("approved");
    expect(
      normalizeActionsMapFilters({ statusFilter: "rejected" }, 90)
        .statusFilter,
    ).toBe("approved");
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
        dateScope: "all_time",
        statusFilter: "pending",
        impactFilter: "critique",
        qualityMin: 70,
        zoneQuery: "  Canal Saint-Martin  ",
        visibleCategories: { violet: false },
      },
      90,
    );

    writeActionsMapFiltersToStorage(storage, filters);

    expect(readActionsMapFiltersFromStorage(storage, 90)).toEqual(filters);
  });

  it("normalizes zone queries and matches labels", () => {
    expect(normalizeZoneQuery("  Paris   11e  ")).toBe("Paris 11e");
    expect(normalizeZoneQuery(42)).toBe("");

    const item = buildMapItem({
      location_label: "Canal Saint-Martin",
      contract: {
        id: "contract-1",
        type: "action",
        status: "approved",
        source: "actions",
        location: {
          label: "Canal Saint-Martin",
          latitude: 48.85,
          longitude: 2.35,
        },
        geometry: {
          kind: "point",
          coordinates: [[48.85, 2.35]],
          geojson: null,
          confidence: null,
          geometrySource: "manual",
          origin: "manual",
        },
        dates: {
          observedAt: "2026-04-03",
          createdAt: null,
          importedAt: null,
          validatedAt: null,
        },
        metadata: {
          actorName: null,
          associationName: "",
          notes: null,
          notesPlain: "",
          groupJoinEnabled: null,
          wasteKg: 0,
          cigaretteButts: 0,
          volunteersCount: 0,
          durationMinutes: 0,
          manualDrawing: null,
          placeType: "",
          departureLocationLabel: null,
          arrivalLocationLabel: null,
        },
      },
      notes_plain: "",
    });

    expect(matchesZoneQuery(item, "canal")).toBe(true);
    expect(matchesZoneQuery(item, "république")).toBe(false);

    const arrondissementItem = buildMapItem({
      location_label: "11e",
      notes_plain: "",
    });

    expect(matchesZoneQuery(arrondissementItem, "paris 11")).toBe(true);
  });
});
