import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCommunityEventsQueryString, updateCommunityEventOps } from "./http";

describe("buildCommunityEventsQueryString", () => {
  it("uses defaults when params are missing", () => {
    expect(buildCommunityEventsQueryString()).toBe("limit=120");
  });

  it("clamps values to safe bounds", () => {
    expect(buildCommunityEventsQueryString({ limit: 0 })).toBe("limit=1");
    expect(buildCommunityEventsQueryString({ limit: 9999 })).toBe("limit=300");
  });

  it("keeps a deep-linked event addressable without changing the public endpoint", () => {
    expect(buildCommunityEventsQueryString({ limit: 1, eventId: "event-42" })).toBe(
      "limit=1&eventId=event-42",
    );
  });

  it("serializes a continuation cursor without allowing a second event selector", () => {
    expect(buildCommunityEventsQueryString({ limit: 2, cursor: "v1|past|2026-01-01|2026-01-01T00%3A00%3A00.000Z|event-1" })).toBe(
      "limit=2&cursor=v1%7Cpast%7C2026-01-01%7C2026-01-01T00%253A00%253A00.000Z%7Cevent-1",
    );
  });

  it("serializes an independent future or past pagination phase", () => {
    expect(buildCommunityEventsQueryString({ limit: 120, phase: "past" })).toBe("limit=120&phase=past");
  });
});

describe("updateCommunityEventOps", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("envoie exactement la mutation historique et retourne la fiche rechargée", async () => {
    const responseItem = { id: "event-1", attendanceCount: 12, postMortem: "Retour" };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", item: responseItem }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateCommunityEventOps({
      eventId: "event-1",
      attendanceCount: 12,
      postMortem: "Retour",
    })).resolves.toEqual(responseItem);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/community/events/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: "event-1", attendanceCount: 12, postMortem: "Retour" }),
    });
  });

  it("propage un refus d'authentification sans faux succès", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    ));

    await expect(updateCommunityEventOps({ eventId: "event-1", attendanceCount: null, postMortem: null }))
      .rejects.toMatchObject({ status: 401, kind: "permission" });
  });
});
