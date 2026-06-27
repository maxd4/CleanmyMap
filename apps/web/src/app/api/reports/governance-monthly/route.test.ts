import { describe, expect, it, vi } from "vitest";

const governanceReportRecord = {
  id: "governance-2026-05-01",
  reportKey: "cleanmymap-governance",
  reportMonth: "2026-05-01",
  generatedAt: "2026-05-20T12:00:00.000Z",
  version: "governance-monthly-report-2026.05-v1",
  title: "Rapport mensuel de gouvernance",
  payload: {
    generatedAt: "2026-05-20T12:00:00.000Z",
    reportMonth: "2026-05-01",
    reportMonthLabel: "mai 2026",
    summary: ["Impact mensuel estimé: 2.5 kg CO2e proxy."],
    impact: {
      monthlyKgCo2eProxy: 2.5,
      confidencePercent: 90,
      snapshotCount: 1,
      latestSnapshotDate: "2026-05-20",
      topServiceLabel: "Supabase",
      topServiceMonthlyKgCo2eProxy: 2.5,
      topServiceDeltaKgCo2eProxy: 0,
      growthHighlights: [],
    },
    storage: {
      quotaBytes: 1_000_000,
      quotaLabel: "1 MB",
      totalBytes: 5_000,
      totalLabel: "5 KB",
      remainingBytes: 995_000,
      remainingLabel: "995 KB",
      usagePercent: 50,
      objectCount: 2,
      snapshotCount: 1,
      latestSnapshotMonth: "2026-05-01",
      deltaBytes: 0,
      deltaPercent: null,
      topBucketLabel: null,
      topBucketBytes: 0,
      topExtensionLabel: null,
      topExtensionBytes: 0,
      growthHighlights: [],
    },
    artifacts: {
      pdfStoragePath: "governance-monthly/rapport_gouvernance_mensuel_2026-05.pdf",
      pdfGeneratedAt: "2026-05-20T12:00:00.000Z",
    },
    notes: [],
  },
};

const loadGovernanceMonthlyReportMock = vi.hoisted(() =>
  vi.fn(async () => governanceReportRecord),
);
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const signedPdfUrl = "https://supabase.test/storage/v1/object/sign/reports/governance-monthly/rapport_gouvernance_mensuel_2026-05.pdf?token=abc123";

vi.mock("@/lib/governance/governance-monthly-report", () => ({
  loadGovernanceMonthlyReport: loadGovernanceMonthlyReportMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

import { GET } from "./route";

describe("governance monthly report route", () => {
  it("redirects to the precompiled PDF asset", async () => {
    getSupabaseServerClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn(async () => ({
            data: { signedUrl: signedPdfUrl },
            error: null,
          })),
        })),
      },
    });

    const response = await GET(new Request("http://localhost/api/reports/governance-monthly"));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(signedPdfUrl);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=3600");
    expect(loadGovernanceMonthlyReportMock).toHaveBeenCalledWith(null);
    expect(getSupabaseServerClientMock).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when the pdf asset has not been prepared", async () => {
    loadGovernanceMonthlyReportMock.mockResolvedValueOnce({
      ...governanceReportRecord,
      payload: {
        ...governanceReportRecord.payload,
        artifacts: undefined,
      },
    } as never);

    const response = await GET(new Request("http://localhost/api/reports/governance-monthly"));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toContain("préparé");
  });

  it("returns 404 when no report exists", async () => {
    loadGovernanceMonthlyReportMock.mockResolvedValueOnce(null as never);

    const response = await GET(new Request("http://localhost/api/reports/governance-monthly"));

    expect(response.status).toBe(404);
  });
});
