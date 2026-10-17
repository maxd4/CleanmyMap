import { afterEach, describe, expect, it, vi } from "vitest";
import { openPrintableReport } from "./browser-report";
import type { PdfReportPayload } from "./simple-pdf";

const payload = {
  title: "Rapport test",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  data: {
    summary: ["Résumé fidèle."],
    generatedAt: "2026-06-01T12:00:00.000Z",
  },
} satisfies PdfReportPayload;

function createReportWindow() {
  return {
    document: {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    },
    focus: vi.fn(),
  } as unknown as Window;
}

describe("browser report delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the official printable HTML in the pre-opened window", () => {
    const reportWindow = createReportWindow();
    const open = vi.fn().mockReturnValue(reportWindow);
    vi.stubGlobal("window", { open });

    const result = openPrintableReport(payload, "rapport_test.pdf");

    expect(result).toBe("opened");
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(reportWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("Résumé fidèle."));
    expect(reportWindow.focus).toHaveBeenCalledTimes(1);
  });

  it("refuses delivery when the popup is blocked instead of downloading a lossy fallback", () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });

    expect(openPrintableReport(payload, "rapport_test.pdf")).toBe("blocked");
    expect(open).toHaveBeenCalledWith("", "_blank");
  });

  it("uses an already opened window without attempting a second popup", () => {
    const reportWindow = createReportWindow();
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });

    expect(openPrintableReport(payload, "rapport_test.pdf", undefined, reportWindow)).toBe("opened");
    expect(open).not.toHaveBeenCalled();
    expect(reportWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("Rapport test"));
  });
});
