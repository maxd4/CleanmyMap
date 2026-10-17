import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IncompatibleReportRendererError,
  openPrintableReport,
} from "./browser-report";
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

  it.each([
    ["impact", "linear-gradient"],
    ["scientific", 'data-report-theme="scientific"'],
  ] as const)("passes the selected %s theme to the official renderer", (theme, marker) => {
    const reportWindow = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });

    expect(openPrintableReport(payload, "rapport_test.pdf", undefined, reportWindow, { theme })).toBe("opened");

    expect(reportWindow.document.write).toHaveBeenCalledWith(expect.stringContaining(marker));
    expect(reportWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining('data-report-theme="' + theme + '"'),
    );
    expect(reportWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("Résumé fidèle."));
    expect(reportWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("@page { size: A4 portrait;"));
  });

  it("refuses a snapshot whose recorded template or renderer is unavailable", () => {
    const reportWindow = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    const incompatible = {
      ...payload,
      snapshotSchemaVersion: 2 as const,
      snapshotMetadata: {
        templateVersion: "reports-template-v9",
        rendererVersion: "official-report-html-v9",
      },
    } as typeof payload;

    expect(() => openPrintableReport(incompatible, "rapport_test.pdf", undefined, reportWindow)).toThrow(
      IncompatibleReportRendererError,
    );
    expect(reportWindow.document.write).not.toHaveBeenCalled();
  });
});
