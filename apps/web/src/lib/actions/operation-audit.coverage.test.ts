import { describe, expect, it, vi } from "vitest";
import { fetchActionOperationAudit } from "./operation-audit";

function response(body: unknown, ok = true): Response {
  return { ok, json: vi.fn(async () => body) } as unknown as Response;
}

const validEntry = { operationId: "op-1", at: "2026-10-27T00:00:00Z", actorUserId: "u1", actorLabel: "Admin", operationType: "moderation", outcome: "success", targetId: "a1", details: {} };

describe("action operation audit projection", () => {
  it("requests a bounded audit page and keeps valid entries", async () => {
    const fetchImpl = vi.fn(async () => response({ items: [validEntry] }));
    await expect(fetchActionOperationAudit("a/1", 7, fetchImpl)).resolves.toEqual({ items: [validEntry] });
    expect(fetchImpl).toHaveBeenCalledWith("/api/actions/a%2F1/audit?limit=7", expect.objectContaining({ method: "GET" }));
  });

  it("drops malformed entries and returns no items for malformed envelopes", async () => {
    const malformed = [null, {}, { items: [null] }, { items: [{ ...validEntry, operationType: "unknown" }] }, { items: [{ ...validEntry, actorLabel: 3 }] }, { items: [{ ...validEntry, targetId: 3 }] }, { items: [{ ...validEntry, details: [] }] }];
    for (const body of malformed) await expect(fetchActionOperationAudit("a1", 1, vi.fn(async () => response(body)))).resolves.toEqual({});
    await expect(fetchActionOperationAudit("a1", 1, vi.fn(async () => response({ error: "unavailable" }, false)))).rejects.toThrow("unavailable");
    await expect(fetchActionOperationAudit("a1", 1, vi.fn(async () => response({}, false)))).rejects.toThrow("Journal indisponible");
    await expect(fetchActionOperationAudit("a1", 1, vi.fn(async () => ({ ok: true, json: vi.fn(async () => { throw new Error("bad json"); }) } as unknown as Response)))).resolves.toEqual({});
  });
});
