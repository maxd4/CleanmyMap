import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchActionById,
  fetchActionDuplicatePrefill,
  fetchActionPrefill,
  publishAction,
  updateAction,
} from "./http-action-editor";

function response(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return { ok, status, json: vi.fn(async () => body) } as unknown as Response;
}

describe("action editor HTTP boundary", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("accepts valid prefill, action, duplicate, update and publish responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ status: "ok", prefill: {}, basedOn: { recentDeclarations: 1 } }))
      .mockResolvedValueOnce(response({ status: "ok", action: { id: "a1" } }))
      .mockResolvedValueOnce(response({ status: "ok", prefill: { actionDate: "2026-01-01" } }))
      .mockResolvedValueOnce(response({ actionId: "a1", actionPhase: "post_action_complete" }))
      .mockResolvedValueOnce(response({ id: "a1", publishedAt: "2026-01-01T00:00:00Z", alreadyPublished: false }));

    await expect(fetchActionPrefill()).resolves.toMatchObject({ status: "ok" });
    await expect(fetchActionById("a/1")).resolves.toMatchObject({ id: "a1" });
    await expect(fetchActionDuplicatePrefill("a/1")).resolves.toMatchObject({ actionDate: "2026-01-01" });
    await expect(updateAction("a/1", { locationLabel: "Paris" })).resolves.toEqual({ actionId: "a1", actionPhase: "post_action_complete" });
    await expect(publishAction("a/1")).resolves.toMatchObject({ id: "a1", alreadyPublished: false });

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["/api/actions/prefill", "GET"],
      ["/api/actions/a%2F1", "GET"],
      ["/api/actions/a%2F1/duplicate", "GET"],
      ["/api/actions/a%2F1", "PATCH"],
      ["/api/actions/a%2F1/publish", "POST"],
    ]);
  });

  it("rejects failed and malformed responses without returning unvalidated payloads", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: "forbidden" }, false, 403))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response({ status: "ok" }))
      .mockResolvedValueOnce(response({ prefill: {} }, false, 404))
      .mockResolvedValueOnce(response({ id: "a1" }));

    await expect(fetchActionPrefill()).rejects.toThrow();
    await expect(fetchActionById("a1")).rejects.toThrow("incomplète");
    await expect(fetchActionDuplicatePrefill("a1")).rejects.toThrow("incomplète");
    await expect(updateAction("a1", {})).rejects.toThrow();
    await expect(publishAction("a1")).rejects.toThrow("incomplète");
  });
});
