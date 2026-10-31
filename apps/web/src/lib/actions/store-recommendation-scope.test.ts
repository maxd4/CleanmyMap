import { describe, expect, it, vi } from "vitest";
import { fetchActions } from "./store";

vi.mock("server-only", () => ({}));

describe("public recommendation query scope", () => {
  it("applies normalized territorial and future pre-action filters before paginating", async () => {
    const imatchCalls: unknown[][] = [];
    const statusInCalls: unknown[][] = [];
    const eqCalls: unknown[][] = [];
    const gteCalls: unknown[][] = [];
    const orCalls: unknown[][] = [];
    const rangeCalls: unknown[][] = [];
    const query = {
      select: () => query,
      order: () => query,
      range: (...args: unknown[]) => {
        rangeCalls.push(args);
        return query;
      },
      limit: () => query,
      eq: (...args: unknown[]) => {
        eqCalls.push(args);
        return query;
      },
      in: (...args: unknown[]) => {
        statusInCalls.push(args);
        return query;
      },
      imatch: (...args: unknown[]) => {
        imatchCalls.push(args);
        return query;
      },
      or: (...args: unknown[]) => {
        orCalls.push(args);
        return query;
      },
      gte: (...args: unknown[]) => {
        gteCalls.push(args);
        return query;
      },
      not: () => query,
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    };

    await fetchActions({ from: () => query } as never, {
      limit: null,
      status: "approved",
      includeFuturePublicActions: true,
      futurePublicPreActionsOnly: true,
      futureOnly: true,
      locationLabelPattern: "^[[:space:]]*(?:11e|12e)[[:space:]]*$",
    });

    expect(imatchCalls).toEqual([["location_label", "^[[:space:]]*(?:11e|12e)[[:space:]]*$"]]);
    expect(statusInCalls).toContainEqual(["status", ["approved", "pending"]]);
    expect(eqCalls).toContainEqual(["action_phase", "pre_action"]);
    expect(gteCalls).toEqual([["action_date", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]]);
    expect(orCalls).not.toContainEqual([expect.stringContaining("action_phase.neq.pre_action")]);
    expect(rangeCalls).toEqual([[0, 999]]);
  });
});
