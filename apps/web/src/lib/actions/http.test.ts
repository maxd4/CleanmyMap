import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMapActionsQueryString, createAction } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createAction", () => {
  it("retries with the legacy payload when the contract payload is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Validation failed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "created", id: "action-1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await createAction({
      actorName: "Test User",
      associationName: "Action spontanee",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu",
      wasteKg: 1.5,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "Test",
    });

    expect(result).toEqual({ id: "action-1", retentionLoop: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("buildMapActionsQueryString", () => {
  it("defaults to approved status for map safety", () => {
    const query = buildMapActionsQueryString();
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("approved");
  });

  it("allows explicit all status", () => {
    const query = buildMapActionsQueryString({ status: "all" });
    const params = new URLSearchParams(query);
    expect(params.has("status")).toBe(false);
  });
});
