import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshCommunityDigest } from "./digest-http";

describe("community digest surface trigger", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts only to the authenticated refresh endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await refreshCommunityDigest();

    expect(fetchMock).toHaveBeenCalledWith("/api/community/digest/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });

  it("does not turn an opportunistic refresh failure into a surface error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(refreshCommunityDigest()).resolves.toBeUndefined();
  });
});
