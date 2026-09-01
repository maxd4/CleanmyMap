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
  priorityVsDistance: 42,
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

  it("ignores removed legacy fields while preserving valid current fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        constraints: {
          availableMinutes: 601,
          volunteers: 2,
          weather: "storm",
          impactVsDistance: 12,
          maxStops: 9,
        },
      }),
    );

    expect(readRouteDraftOptions(storage)).toEqual({
      priorityVsDistance: 65,
      maxStops: 9,
    });
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
