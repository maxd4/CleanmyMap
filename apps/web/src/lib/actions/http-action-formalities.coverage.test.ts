import { describe, expect, it, vi } from "vitest";
import { fetchActionAdministrativeRequirements, fetchActionFormalities, updateActionFormalities, validateActionAdministrativeRequirements } from "./http-action-formalities";

function response(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return { ok, status, json: vi.fn(async () => body) } as unknown as Response;
}

const formalities = { status: "ok", actionId: "a1", facts: {}, qualification: {}, workflow: {} };

describe("action formalities HTTP boundary", () => {
  it("accepts valid reads, updates and administrative validation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(formalities))
      .mockResolvedValueOnce(response(formalities))
      .mockResolvedValueOnce(response({ status: "validated", validatedAt: "2026-10-27T00:00:00Z", canValidate: true }))
      .mockResolvedValueOnce(response({ status: "ok", actionId: "a1", administrativeRequirements: { status: "validated", validatedAt: "2026-10-27T00:00:00Z" } }));
    await expect(fetchActionFormalities("a/1")).resolves.toMatchObject({ actionId: "a1" });
    await expect(updateActionFormalities("a/1", { transition: "validate" as never })).resolves.toMatchObject({ status: "ok" });
    await expect(fetchActionAdministrativeRequirements("a/1")).resolves.toMatchObject({ status: "validated" });
    await expect(validateActionAdministrativeRequirements("a/1")).resolves.toMatchObject({ actionId: "a1" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("rejects failed, malformed and invalid administrative responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: "denied" }, false, 403))
      .mockResolvedValueOnce(response({ status: "ok", actionId: "a1" }))
      .mockResolvedValueOnce(response({ status: "pending", validatedAt: 4, canValidate: true }))
      .mockResolvedValueOnce(response({ status: "ok", actionId: 4, administrativeRequirements: {} }));
    await expect(fetchActionFormalities("a1")).rejects.toThrow();
    await expect(updateActionFormalities("a1", {})).rejects.toThrow("incomplète");
    await expect(fetchActionAdministrativeRequirements("a1")).rejects.toThrow("incomplète");
    await expect(validateActionAdministrativeRequirements("a1")).rejects.toThrow("incomplète");
  });
});
