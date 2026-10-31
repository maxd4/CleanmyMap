import { describe, expect, it, vi } from "vitest";
import { fetchActions } from "./store";

vi.mock("server-only", () => ({}));

describe("public recommendation query scope", () => {
  it("applies territorial filters before paginating a complete public read", async () => {
    const inCalls: unknown[][] = [];
    const eqCalls: unknown[][] = [];
    const query = {
      select: () => query,
      order: () => query,
      range: () => query,
      limit: () => query,
      eq: (...args: unknown[]) => {
        eqCalls.push(args);
        return query;
      },
      in: (...args: unknown[]) => {
        inCalls.push(args);
        return query;
      },
      or: () => query,
      gte: () => query,
      not: () => query,
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    };

    await fetchActions({ from: () => query } as never, {
      limit: null,
      status: "approved",
      includeFuturePublicActions: true,
      futureOnly: true,
      locationLabels: ["11e arrondissement", "12e arrondissement"],
    });

    expect(inCalls).toContainEqual(["location_label", ["11e arrondissement", "12e arrondissement"]]);
    expect(eqCalls).not.toContainEqual(["location_label", expect.anything()]);
  });
});
