import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMyObservationsReadController,
  fetchMyObservations,
  MyObservationsReadError,
} from "./my-observations-client";

const observation = {
  id: "spot-1",
  createdAt: "2026-08-26T10:00:00Z",
  type: "spot" as const,
  label: "Quai de Seine",
  status: "new" as const,
  latitude: 48.85,
  longitude: 2.35,
  validatedAt: null,
  cleanedAt: null,
};

describe("my observations client", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("fetches the dedicated private endpoint without an owner parameter", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok", items: [observation] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMyObservations()).resolves.toEqual([observation]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/signalements/me",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("exposes loading, empty, error and refresh states", async () => {
    const fetcher = vi
      .fn<() => Promise<typeof observation[]>>()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new MyObservationsReadError("Temporary failure", "request"))
      .mockResolvedValueOnce([observation]);
    const statuses: string[] = [];
    const controller = createMyObservationsReadController(
      (snapshot) => statuses.push(snapshot.status),
      fetcher,
    );

    expect(controller.getSnapshot().status).toBe("idle");
    await controller.load();
    expect(controller.getSnapshot().status).toBe("empty");
    await controller.refresh();
    expect(controller.getSnapshot().status).toBe("error");
    await controller.retry();
    expect(controller.getSnapshot().status).toBe("ready");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual(["loading", "empty", "loading", "error", "loading", "ready"]);
  });
});
