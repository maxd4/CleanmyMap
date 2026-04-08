import { afterEach, describe, expect, it, vi } from "vitest";
import { postAdminModeration } from "./moderation-client";

describe("moderation client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed moderation payload on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          entityType: "action",
          id: "a1",
          sourceTable: "actions",
          copiedToLocalValidatedStore: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await postAdminModeration({ entityType: "action", id: "a1", status: "approved" });
    expect(result.status).toBe("ok");
    expect(result.sourceTable).toBe("actions");
    expect(result.copiedToLocalValidatedStore).toBe(true);
  });

  it("maps 403 into permission_denied error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(postAdminModeration({ entityType: "action", id: "a1", status: "approved" })).rejects.toMatchObject({
      name: "ModerationClientError",
      code: "permission_denied",
    });
  });

  it("maps network failure into network_error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("socket"));

    await expect(postAdminModeration({ entityType: "clean_place", id: "c1", status: "validated" })).rejects.toMatchObject({
      name: "ModerationClientError",
      code: "network_error",
    });
  });
});
