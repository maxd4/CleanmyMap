import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicActionReference, type PublicActionReference } from "./action-reference-http";

const reference: PublicActionReference = {
  id: "action/1",
  shareKind: "invitation",
  title: "Nettoyage test",
  actionDate: "2026-10-26",
  eventStartTime: null,
  eventEndTime: null,
  locationLabel: "Paris 5e",
  organizerLabel: "Association test",
  participantsExpected: 4,
  durationMinutes: 90,
  objective: "Nettoyage",
  route: null,
  groupJoinEnabled: false,
  event: null,
};

describe("fetchPublicActionReference", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches an encoded public reference without enabling shared caching", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ reference }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublicActionReference(reference.id)).resolves.toEqual(reference);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/actions/action%2F1/public",
      { cache: "no-store" },
    );
  });

  it("rejects an unavailable action and does not expose the response body", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ secret: "private" }), { status: 404 }),
    ));

    await expect(fetchPublicActionReference("missing")).rejects.toThrow(
      "Action indisponible",
    );
  });

  it("rejects a missing or mismatched reference instead of returning another action", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ reference: { ...reference, id: "other-action" } }),
    ));

    await expect(fetchPublicActionReference(reference.id)).rejects.toThrow(
      "Référence d'action invalide",
    );
  });
});
