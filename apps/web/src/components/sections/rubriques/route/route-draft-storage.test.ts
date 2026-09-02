import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE_OPTIONS,
  ROUTE_DRAFT_SCHEMA_VERSION,
  ROUTE_DRAFT_STORAGE_KEY,
  readRouteDraftOptions,
  writeRouteDraftOptions,
} from "./route-draft-storage";
import type { RouteOptions } from "./route-types";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const nonDefaultOptions: RouteOptions = {
  priorityVsTravel: 42,
  travelBudgetMinutes: 90,
  maxStops: 9,
};

describe("route draft storage contract", () => {
  it("serializes only the versioned route options and restores them", () => {
    const storage = new MemoryStorage();

    writeRouteDraftOptions(storage, nonDefaultOptions);

    expect(JSON.parse(storage.getItem(ROUTE_DRAFT_STORAGE_KEY)!)).toEqual({
      version: ROUTE_DRAFT_SCHEMA_VERSION,
      options: nonDefaultOptions,
    });
    expect(readRouteDraftOptions(storage)).toEqual(nonDefaultOptions);
  });

  it("uses canonical defaults for corrupt or incompatible drafts", () => {
    const storage = new MemoryStorage();

    storage.setItem(ROUTE_DRAFT_STORAGE_KEY, "not-json");
    expect(readRouteDraftOptions(storage)).toEqual(DEFAULT_ROUTE_OPTIONS);

    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 0, options: nonDefaultOptions }),
    );
    expect(readRouteDraftOptions(storage)).toEqual(DEFAULT_ROUTE_OPTIONS);
  });

  it("migrates priorityVsDistance from an old draft and preserves valid fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        options: {
          priorityVsDistance: 42,
          maxStops: 9,
        },
      }),
    );

    expect(readRouteDraftOptions(storage)).toEqual({
      priorityVsTravel: 42,
      travelBudgetMinutes: 60,
      maxStops: 9,
    });
  });

  it("keeps older version 2 drafts readable and writes only the new contract", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        options: { priorityVsDistance: 30, maxStops: 1 },
      }),
    );

    expect(readRouteDraftOptions(storage)).toEqual({
      priorityVsTravel: 30,
      travelBudgetMinutes: 60,
      maxStops: 1,
    });

    writeRouteDraftOptions(storage, nonDefaultOptions);
    const persisted = JSON.parse(storage.getItem(ROUTE_DRAFT_STORAGE_KEY)!);
    expect(persisted).toEqual({
      version: ROUTE_DRAFT_SCHEMA_VERSION,
      options: nonDefaultOptions,
    });
    expect(JSON.stringify(persisted)).not.toContain("priorityVsDistance");
    expect(JSON.stringify(persisted)).not.toContain("latitude");
    expect(JSON.stringify(persisted)).not.toContain("longitude");
  });

  it("bounds budget and maxStops while retaining safe defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: ROUTE_DRAFT_SCHEMA_VERSION,
        options: {
          priorityVsTravel: 120,
          travelBudgetMinutes: 601,
          maxStops: 0,
        },
      }),
    );

    expect(readRouteDraftOptions(storage)).toEqual(DEFAULT_ROUTE_OPTIONS);
  });

  it("does not throw when browser storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(readRouteDraftOptions(storage)).toEqual(DEFAULT_ROUTE_OPTIONS);
    expect(() => writeRouteDraftOptions(storage, nonDefaultOptions)).not.toThrow();
  });
});
