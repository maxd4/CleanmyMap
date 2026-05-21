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
    notes: [],
  },
};

const loadGovernanceMonthlyReportMock = vi.hoisted(() =>
  vi.fn(async () => governanceReportRecord),
);

vi.mock("@/lib/governance/governance-monthly-report", () => ({
  buildGovernanceMonthlyReportDownloadHeaders: vi.fn(() => ({
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapport_gouvernance_mensuel_cmm_01-05-2026.pdf"`,
      "Cache-Control": "no-store",
      "X-Deliverable-Name": "rapport_gouvernance_mensuel_cmm_01-05-2026.pdf",
      "X-Deliverable-Format": "pdf",
    },
  })),
  buildGovernanceMonthlyReportLines: vi.fn(() => ["Rapport mensuel de gouvernance", "Mai 2026"]),
  listGovernanceMonthlyReports: vi.fn(async () => [governanceReportRecord]),
  loadGovernanceMonthlyReport: loadGovernanceMonthlyReportMock,
}));

import { GET } from "./route";

describe("governance monthly report route", () => {
  it("returns the latest governance report as a PDF", async () => {
    const response = await GET(new Request("http://localhost/api/reports/governance-monthly"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      "rapport_gouvernance_mensuel_cmm_01-05-2026.pdf",
    );
    expect(loadGovernanceMonthlyReportMock).toHaveBeenCalledWith(null);
    expect(response.headers.get("X-Deliverable-Format")).toBe("pdf");
  });

  it("returns 404 when no report exists", async () => {
    loadGovernanceMonthlyReportMock.mockResolvedValueOnce(null as never);

    const response = await GET(new Request("http://localhost/api/reports/governance-monthly"));

    expect(response.status).toBe(404);
  });
});
