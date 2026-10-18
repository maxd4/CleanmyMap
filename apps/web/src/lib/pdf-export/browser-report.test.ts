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
    location: { replace: vi.fn() },
    addEventListener: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
    focus: vi.fn(),
  } as unknown as Window;
}

function stubObjectUrl() {
  const createObjectURL = vi.fn(() => "blob:report-preview");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

async function createdHtml(createObjectURL: ReturnType<typeof vi.fn>): Promise<string> {
  const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
  if (!blob) throw new Error("Aucun document imprimable n'a été créé.");
  return blob.text();
}

describe("browser report delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the official printable HTML in the pre-opened window without document.write", async () => {
    const reportWindow = createReportWindow();
    const open = vi.fn().mockReturnValue(reportWindow);
    vi.stubGlobal("window", { open });
    const { createObjectURL } = stubObjectUrl();

    const result = openPrintableReport(payload, "rapport_test.pdf");

    expect(result).toBe("opened");
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(reportWindow.document.write).not.toHaveBeenCalled();
    expect(reportWindow.location.replace).toHaveBeenCalledWith("blob:report-preview");
    await expect(createdHtml(createObjectURL)).resolves.toContain("Résumé fidèle.");
    expect(reportWindow.focus).toHaveBeenCalledTimes(1);
  });

  it("refuses delivery when the popup is blocked instead of downloading a lossy fallback", () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });

    expect(openPrintableReport(payload, "rapport_test.pdf")).toBe("blocked");
    expect(open).toHaveBeenCalledWith("", "_blank");
  });

  it("uses an already opened window without attempting a second popup", async () => {
    const reportWindow = createReportWindow();
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });
    const { createObjectURL } = stubObjectUrl();

    expect(openPrintableReport(payload, "rapport_test.pdf", undefined, reportWindow)).toBe("opened");
    expect(open).not.toHaveBeenCalled();
    expect(reportWindow.document.write).not.toHaveBeenCalled();
    await expect(createdHtml(createObjectURL)).resolves.toContain("Rapport test");
  });

  it.each([
    ["impact", "linear-gradient"],
    ["scientific", 'data-report-theme="scientific"'],
  ] as const)("passes the selected %s theme to the official renderer", async (theme, marker) => {
    const reportWindow = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    const { createObjectURL } = stubObjectUrl();

    expect(openPrintableReport(payload, "rapport_test.pdf", undefined, reportWindow, { theme })).toBe("opened");

    const html = await createdHtml(createObjectURL);
    expect(html).toContain(marker);
    expect(html).toContain('data-report-theme="' + theme + '"');
    expect(html).toContain("Résumé fidèle.");
    expect(html).toContain("@page { size: A4 portrait;");
    expect(reportWindow.document.write).not.toHaveBeenCalled();
  });

  it("refuses a snapshot whose recorded template or renderer is unavailable", () => {
    const reportWindow = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    stubObjectUrl();
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
