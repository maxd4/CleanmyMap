import { beforeEach, describe, expect, it, vi } from "vitest";

const uploadToSignedUrl = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getBrowserClient = vi.hoisted(() => vi.fn(() => ({ storage: { from: vi.fn(() => ({ uploadToSignedUrl })) } })));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: getBrowserClient }));

import { uploadActionRouteReference } from "./action-route-reference-client";

const response = (body: unknown, ok = true): Response => ({ ok, json: async () => body } as Response);

describe("route-reference upload cleanup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    uploadToSignedUrl.mockReset().mockResolvedValue({ error: null });
  });

  it("requests tombstone cleanup when finalization rejects a transmitted upload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ intent: { mediaId: "media-1", bucket: "action-photos", path: "a/media-1.png", token: "opaque", uploadState: "pending" } }))
      .mockResolvedValueOnce(response({ error: "La référence est désactivée." }, false))
      .mockResolvedValueOnce(response({ ok: true }));

    await expect(uploadActionRouteReference("action-1", new File(["image"], "route.png", { type: "image/png" })))
      .rejects.toThrow("La référence est désactivée.");
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/actions/action-1/media/intents", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ operation: "remove_route_reference", mediaId: "media-1" }),
    }));
  });
});
