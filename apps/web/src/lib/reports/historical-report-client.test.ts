import { describe, expect, it, vi } from "vitest";
import { loadHistoricalReportSnapshot } from "./historical-report-client";

const generation = {
  id: "11111111-1111-4111-8111-111111111111",
  filename: "rapport_reporting_six_months.pdf",
  generatedAt: "2026-08-27T10:30:00.000Z",
  scopeLabel: "Global",
  detailLevel: "default",
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Historique"] },
  },
};

describe("historical report client", () => {
  it("loads exactly one snapshot by ID with GET and validates it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ generation }), { status: 200 }),
    );

    await expect(
      loadHistoricalReportSnapshot(generation.id, fetchMock),
    ).resolves.toEqual(generation);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/reports/generations/${generation.id}`,
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });

  it("does not accept an invalid snapshot response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ generation: { ...generation, snapshot: { nope: true } } }),
        { status: 200 },
      ),
    );

    await expect(loadHistoricalReportSnapshot(generation.id, fetchMock)).rejects.toThrow(
      "invalide ou incompatible",
    );
  });

  it("does not turn a historical read into a POST or a new generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "introuvable" }), { status: 404 }),
    );

    await expect(loadHistoricalReportSnapshot(generation.id, fetchMock)).rejects.toThrow(
      "introuvable",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps two history rows addressed to their own IDs", async () => {
    const secondId = "22222222-2222-4222-8222-222222222222";
    const fetchMock = vi.fn((url: string) => {
      const selected = url.endsWith(secondId) ? { ...generation, id: secondId } : generation;
      return Promise.resolve(new Response(JSON.stringify({ generation: selected }), { status: 200 }));
    });

    await expect(loadHistoricalReportSnapshot(generation.id, fetchMock)).resolves.toMatchObject({
      id: generation.id,
    });
    await expect(loadHistoricalReportSnapshot(secondId, fetchMock)).resolves.toMatchObject({
      id: secondId,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/api/reports/generations/${generation.id}`,
      `/api/reports/generations/${secondId}`,
    ]);
  });
});
