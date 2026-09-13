import { describe, expect, it, vi } from "vitest";
import {
  ACTION_DEPARTMENT_RESOLUTION_TIMEOUT_MS,
  resolveActionDepartment,
  resolveActionDepartmentAnchor,
  resolveActionDepartmentForPersistence,
  resolveTrustedActionDepartmentForPersistence,
} from "./action-department-resolver";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fetchForDepartment(departmentCode: string, departmentName: string) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    return calls.length === 1
      ? jsonResponse([{ codeDepartement: departmentCode, nom: "Commune" }])
      : jsonResponse({ code: departmentCode, nom: departmentName });
  });
  return { calls, fetchImpl };
}

describe("action department resolver", () => {
  it("uses the point coordinates for a point and the canonical fallback", () => {
    expect(
      resolveActionDepartmentAnchor({
        latitude: 48.8566,
        longitude: 2.3522,
        geometry: { kind: "point", coordinates: [[48.8566, 2.3522]] },
      }),
    ).toEqual([48.8566, 2.3522]);
    expect(
      resolveActionDepartmentAnchor({ latitude: 43.3, longitude: 5.4 }),
    ).toEqual([43.3, 5.4]);
  });

  it("uses the first coordinate of a polyline", () => {
    expect(
      resolveActionDepartmentAnchor({
        latitude: 0,
        longitude: 0,
        geometry: {
          kind: "polyline",
          coordinates: [
            [48.8566, 2.3522],
            [48.857, 2.353],
          ],
        },
      }),
    ).toEqual([48.8566, 2.3522]);
  });

  it("uses a deterministic polygon centroid without counting the closing point twice", () => {
    expect(
      resolveActionDepartmentAnchor({
        geometry: {
          kind: "polygon",
          coordinates: [
            [48, 2],
            [48, 4],
            [50, 4],
            [50, 2],
            [48, 2],
          ],
        },
      }),
    ).toEqual([49, 3]);
  });

  it.each([
    ["2A", "Corse-du-Sud"],
    ["2B", "Haute-Corse"],
    ["01", "Ain"],
    ["971", "Guadeloupe"],
  ])("preserves the department code as a string for %s", async (code, name) => {
    const { calls, fetchImpl } = fetchForDepartment(code, name);
    await expect(
      resolveActionDepartment(
        { latitude: 1, longitude: 2 },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: code, departmentName: name });
    expect(calls[0]).toContain("/communes?");
    expect(calls[0]).toContain("codeDepartement");
    expect(calls[1]).toContain(`/departements/${encodeURIComponent(code)}`);
  });

  it("returns null for network failures and never rejects the write path", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    await expect(
      resolveActionDepartment(
        { latitude: 48, longitude: 2 },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toBeNull();
    await expect(
      resolveActionDepartmentForPersistence(
        { latitude: 48, longitude: 2 },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: null, departmentName: null });
  });

  it("rejects invalid API payloads instead of coercing them", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ codeDepartement: 2 }]))
      .mockResolvedValueOnce(jsonResponse({ code: "2A", nom: "Corse-du-Sud" }));
    await expect(
      resolveActionDepartment(
        { latitude: 48, longitude: 2 },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toBeNull();
  });

  it("derives Paris instead of trusting a false client couple", async () => {
    const { calls, fetchImpl } = fetchForDepartment("75", "Paris");
    await expect(
      resolveActionDepartmentForPersistence(
        {
          latitude: 48.8566,
          longitude: 2.3522,
          departmentCode: "2B",
          departmentName: "Haute-Corse",
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: "75", departmentName: "Paris" });
    expect(calls).toHaveLength(2);
  });

  it("does not treat an explicit null couple as authoritative", async () => {
    const { fetchImpl } = fetchForDepartment("75", "Paris");
    await expect(
      resolveActionDepartmentForPersistence(
        {
          latitude: 48.8566,
          longitude: 2.3522,
          departmentCode: null,
          departmentName: null,
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: "75", departmentName: "Paris" });
  });

  it("clears an old attribution after a changed geography cannot be resolved", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    await expect(
      resolveActionDepartmentForPersistence(
        {
          latitude: 48.8566,
          longitude: 2.3522,
          existingDepartmentCode: "75",
          existingDepartmentName: "Paris",
          spatiallyChanged: true,
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: null, departmentName: null });
  });

  it("keeps the server attribution when geography did not change and cannot be resolved", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    await expect(
      resolveActionDepartmentForPersistence(
        {
          existingDepartmentCode: "01",
          existingDepartmentName: "Ain",
          spatiallyChanged: false,
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: "01", departmentName: "Ain" });
  });

  it("accepts an explicit couple only through the trusted import/moderation path", async () => {
    const fetchImpl = vi.fn();
    await expect(
      resolveTrustedActionDepartmentForPersistence(
        {
          latitude: 48.8566,
          longitude: 2.3522,
          departmentCode: "2B",
          departmentName: "Haute-Corse",
          spatiallyChanged: false,
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: "2B", departmentName: "Haute-Corse" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("re-resolves a trusted attribution when the geography changes", async () => {
    const { fetchImpl } = fetchForDepartment("75", "Paris");
    await expect(
      resolveTrustedActionDepartmentForPersistence(
        {
          latitude: 48.8566,
          longitude: 2.3522,
          departmentCode: "2B",
          departmentName: "Haute-Corse",
          spatiallyChanged: true,
        },
        { fetchImpl: fetchImpl as typeof fetch },
      ),
    ).resolves.toEqual({ departmentCode: "75", departmentName: "Paris" });
  });

  it("exposes a bounded timeout contract", () => {
    expect(ACTION_DEPARTMENT_RESOLUTION_TIMEOUT_MS).toBeGreaterThan(0);
    expect(ACTION_DEPARTMENT_RESOLUTION_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });
});
