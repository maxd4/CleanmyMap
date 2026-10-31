import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse as response } from "@/__tests__/support/action-behavior-test-helpers";
import { createCommunityNeed, fetchCommunityNeeds, updateCommunityNeed } from "./needs-http";

afterEach(() => vi.unstubAllGlobals());

describe("community needs HTTP client", () => {
  it("serializes only supported filters and accepts the public projection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: "ok", items: [], managerActions: [], limit: 10, offset: 5, hasMore: false }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchCommunityNeeds({ actionId: "action-1", category: "materiel", effectiveStatus: "expired", limit: 10, offset: 5 })).resolves.toMatchObject({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/api/community/needs?actionId=action-1&category=materiel&effectiveStatus=expired&limit=10&offset=5", undefined);
  });

  it("fails closed on malformed projections, HTTP errors and transport failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "ok", items: null, managerActions: [] }))
      .mockResolvedValueOnce(response({ error: "Accès refusé" }, 403))
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchCommunityNeeds()).rejects.toThrow("réponse des besoins est invalide");
    await expect(fetchCommunityNeeds()).rejects.toThrow("Accès refusé");
    await expect(fetchCommunityNeeds()).rejects.toThrow("ne sont pas disponibles");
  });

  it("keeps create/update mutations explicit and preserves server errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ status: "created", item: { id: "need-1" } }, 201))
      .mockResolvedValueOnce(response({ status: "updated", item: { id: "need-1", status: "fulfilled" } }))
      .mockResolvedValueOnce(response({ error: "Conflit" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createCommunityNeed({ actionId: "action-1", category: "materiel", title: "Gants", description: "Prévoir des gants", quantityLabel: null, expiresAt: null })).resolves.toEqual({ id: "need-1" });
    await expect(updateCommunityNeed("need-1", { operation: "fulfill" })).resolves.toEqual({ id: "need-1", status: "fulfilled" });
    await expect(updateCommunityNeed("need-1", { operation: "cancel" })).rejects.toThrow("Conflit");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/community/needs/need-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ operation: "fulfill" }) }));
  });
});
