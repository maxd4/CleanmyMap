import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE_CONSTRAINTS,
  ROUTE_DRAFT_SCHEMA_VERSION,
  ROUTE_DRAFT_STORAGE_KEY,
  readRouteDraftConstraints,
  writeRouteDraftConstraints,
} from "./route-draft-storage";
import type { RouteConstraints } from "./route-types";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const nonDefaultConstraints: RouteConstraints = {
  availableMinutes: 255,
  volunteers: 7,
  accessibility: "strict",
  security: "renforced",
  weather: "wind",
  impactVsDistance: 42,
  maxStops: 9,
};

describe("route draft storage contract", () => {
  it("serializes only the versioned route constraints and restores them", () => {
    const storage = new MemoryStorage();

    writeRouteDraftConstraints(storage, nonDefaultConstraints);

    expect(JSON.parse(storage.getItem(ROUTE_DRAFT_STORAGE_KEY)!)).toEqual({
      version: ROUTE_DRAFT_SCHEMA_VERSION,
      constraints: nonDefaultConstraints,
    });
    expect(readRouteDraftConstraints(storage)).toEqual(nonDefaultConstraints);
  });

  it("uses canonical defaults for corrupt or incompatible drafts", () => {
    const storage = new MemoryStorage();

    storage.setItem(ROUTE_DRAFT_STORAGE_KEY, "not-json");
    expect(readRouteDraftConstraints(storage)).toEqual(DEFAULT_ROUTE_CONSTRAINTS);

    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: ROUTE_DRAFT_SCHEMA_VERSION - 1, constraints: nonDefaultConstraints }),
    );
    expect(readRouteDraftConstraints(storage)).toEqual(DEFAULT_ROUTE_CONSTRAINTS);
  });

  it("falls back per field when values are unknown, fractional, or out of bounds", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ROUTE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: ROUTE_DRAFT_SCHEMA_VERSION,
        constraints: {
          availableMinutes: 601,
          volunteers: 2.5,
          accessibility: "unknown",
          security: "unsafe",
          weather: "storm",
          impactVsDistance: -1,
          maxStops: 13,
        },
      }),
    );

    expect(readRouteDraftConstraints(storage)).toEqual(DEFAULT_ROUTE_CONSTRAINTS);
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

    expect(readRouteDraftConstraints(storage)).toEqual(DEFAULT_ROUTE_CONSTRAINTS);
    expect(() => writeRouteDraftConstraints(storage, nonDefaultConstraints)).not.toThrow();
  });
});
