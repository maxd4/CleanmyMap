import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPilotageOverview } from "./elus-section-overview";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ElusSection overview loader", () => {
  it("keeps the no-store request and response contract", async () => {
    const payload = {
      status: "ok",
      generatedAt: "2026-10-03T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/pilotage/overview", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("preserves the response status and body when loading fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).rejects.toMatchObject({
      message: "forbidden",
      status: 403,
    });
  });
});
