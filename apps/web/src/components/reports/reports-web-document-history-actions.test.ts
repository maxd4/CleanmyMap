import { describe, expect, it, vi } from "vitest";
import { createReportsWebDocumentHistoryActions } from "./reports-web-document-history-actions";

const mocks = vi.hoisted(() => ({
  prepareReportWindow: vi.fn(),
  renderReportWindow: vi.fn(),
  deriveHistoricalReportSnapshot: vi.fn(),
  loadHistoricalReportSnapshot: vi.fn(),
}));

vi.mock("@/lib/pdf-export/browser-report", () => ({
  prepareReportWindow: mocks.prepareReportWindow,
  renderReportWindow: mocks.renderReportWindow,
}));

vi.mock("@/lib/reports/historical-report-client", () => ({
  deriveHistoricalReportSnapshot: mocks.deriveHistoricalReportSnapshot,
  loadHistoricalReportSnapshot: mocks.loadHistoricalReportSnapshot,
}));

vi.mock("@/components/reports/report-pdf-actions", () => ({
  downloadHistoricalReportData: vi.fn(),
  downloadOrShareReportPdf: vi.fn(),
}));

vi.mock("@/lib/reports/report-scientific-export", () => ({
  buildReportScientificReference: vi.fn(),
}));

vi.mock("@/lib/reports/historical-report-replay", () => ({
  replayHistoricalReport: vi.fn(),
}));

describe("createReportsWebDocumentHistoryActions", () => {
  it("refreshes the active server page after deriving without injecting a local row", async () => {
    const reportWindow = { closed: false } as unknown as Window;
    const refreshHistory = vi.fn().mockResolvedValue(undefined);
    const setHistoryAvailability = vi.fn();
    const setDailyExportAvailability = vi.fn();
    const setHistoryActionStateById = vi.fn();
    const payload = { snapshot: true } as never;

    mocks.prepareReportWindow.mockReturnValueOnce(reportWindow);
    mocks.deriveHistoricalReportSnapshot.mockResolvedValueOnce({
      generation: { snapshot: payload },
      item: { id: "derived", report: "Derived" },
    });

    const actions = createReportsWebDocumentHistoryActions({
      reportTheme: "impact",
      refreshHistory,
      setHistoryAvailability,
      setDailyExportAvailability,
      setHistoryActionStateById,
    });

    await actions.handleHistoricalAction("source", "derive", { current: null });

    expect(refreshHistory).toHaveBeenCalledTimes(1);
    expect(setHistoryAvailability).toHaveBeenCalledWith("available");
    expect(mocks.renderReportWindow).toHaveBeenCalledWith(reportWindow, payload, { theme: "impact" });
    expect(setHistoryActionStateById).toHaveBeenCalled();
  });
});
