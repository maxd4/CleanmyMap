import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  listReportGenerationHistory,
  persistReportGeneration,
} from "./report-generation-history-store";

const payload = {
  title: "Rapport d'impact - Paris - Par défaut",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Résumé"] },
};

const dbRow = {
  id: "generation-1",
  created_at: "2026-08-27T10:30:01.000Z",
  generated_at: "2026-08-27T10:30:00.000Z",
  created_by_clerk_id: "user-admin",
  title: payload.title,
  filename: "rapport_reporting_six_months.pdf",
  period_id: payload.periode,
  scope_kind: "global",
  scope_value: "",
  scope_label: "Paris",
  detail_level: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
  snapshot: payload,
};

describe("report generation history store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists persisted rows newest first with a bounded limit", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [dbRow], error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    await expect(listReportGenerationHistory(99)).resolves.toMatchObject([
      {
        id: "generation-1",
        period: "Six mois",
        perimeter: "Paris",
        detail: "Par défaut (12 à 16 pages)",
      },
    ]);
    expect(limit).toHaveBeenCalledWith(12);
  });

  it("persists the exact payload and server-derived filename", async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    });

    await expect(
      persistReportGeneration({
        createdByClerkId: "user-admin",
        input: {
          payload,
          scopeKind: "global",
          scopeValue: "",
          scopeLabel: "Paris",
          detailLevel: "default",
          modules: {
            dataAndCartography: true,
            transparencyAndMethods: true,
            rawData: false,
            detailedFiles: true,
          },
        },
      }),
    ).resolves.toMatchObject({ id: "generation-1", report: payload.title });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_clerk_id: "user-admin",
        filename: "rapport_reporting_six_months.pdf",
        generated_at: payload.data.generatedAt,
        snapshot: payload,
      }),
    );
  });
});
