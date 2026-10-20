import { beforeEach, describe, expect, it, vi } from "vitest";

const executablePathMock = vi.hoisted(() => vi.fn());
const launchMock = vi.hoisted(() => vi.fn());

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--test-flag"],
    executablePath: executablePathMock,
  },
}));

vi.mock("puppeteer-core", () => ({
  default: {
    launch: launchMock,
  },
}));

import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";

const payload: PdfReportPayload = {
  title: "Rapport de test",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "multi_action",
  data: {
    generatedAt: "2026-10-17T12:00:00.000Z",
    summary: ["Contenu canonique"],
  },
};

function page() {
  return {
    setViewport: vi.fn().mockResolvedValue(undefined),
    setContent: vi.fn().mockResolvedValue(undefined),
    emulateMediaType: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 55])),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function browser(...pages: ReturnType<typeof page>[]) {
  return {
    newPage: vi.fn().mockImplementation(async () => {
      const next = pages.shift();
      if (!next) throw new Error("No fake page available");
      return next;
    }),
  };
}

async function loadRenderer() {
  vi.resetModules();
  return import("./report-pdf-renderer");
}

describe("renderOfficialReportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executablePathMock.mockResolvedValue("C:/chromium/chrome.exe");
  });

  it("renders the requested official theme with the A4 print contract and closes the page", async () => {
    const renderedPage = page();
    const renderedBrowser = browser(renderedPage);
    launchMock.mockResolvedValue(renderedBrowser);
    const { renderOfficialReportPdf } = await loadRenderer();

    await expect(renderOfficialReportPdf({ payload, theme: "scientific" })).resolves.toEqual(
      Buffer.from("%PDF-1.7"),
    );

    expect(executablePathMock).toHaveBeenCalledOnce();
    expect(launchMock).toHaveBeenCalledWith({
      args: ["--test-flag"],
      executablePath: "C:/chromium/chrome.exe",
      headless: true,
    });
    expect(renderedPage.setViewport).toHaveBeenCalledWith({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });
    expect(renderedPage.setContent).toHaveBeenCalledWith(
      expect.stringContaining('data-report-theme="scientific"'),
      { waitUntil: "load" },
    );
    expect(renderedPage.emulateMediaType).toHaveBeenCalledWith("print");
    expect(renderedPage.pdf).toHaveBeenCalledWith({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    expect(renderedPage.close).toHaveBeenCalledOnce();
  });

  it("retries browser initialization after Chromium launch failure and does not use a fallback renderer", async () => {
    const renderedPage = page();
    const renderedBrowser = browser(renderedPage);
    const launchError = new Error("Chromium unavailable");
    launchMock.mockRejectedValueOnce(launchError).mockResolvedValueOnce(renderedBrowser);
    const { renderOfficialReportPdf } = await loadRenderer();

    await expect(renderOfficialReportPdf({ payload, theme: "impact" })).rejects.toThrow(launchError);
    await expect(renderOfficialReportPdf({ payload, theme: "impact" })).resolves.toEqual(
      Buffer.from("%PDF-1.7"),
    );

    expect(launchMock).toHaveBeenCalledTimes(2);
    expect(renderedPage.pdf).toHaveBeenCalledOnce();
  });

  it("always closes the page when Chromium fails while loading or printing", async () => {
    const loadFailurePage = page();
    loadFailurePage.setContent.mockRejectedValueOnce(new Error("HTML load failed"));
    const printFailurePage = page();
    printFailurePage.pdf.mockRejectedValueOnce(new Error("PDF failed"));
    const renderedBrowser = browser(loadFailurePage, printFailurePage);
    launchMock.mockResolvedValue(renderedBrowser);
    const { renderOfficialReportPdf } = await loadRenderer();

    await expect(renderOfficialReportPdf({ payload, theme: "impact" })).rejects.toThrow("HTML load failed");
    await expect(renderOfficialReportPdf({ payload, theme: "impact" })).rejects.toThrow("PDF failed");

    expect(loadFailurePage.close).toHaveBeenCalledOnce();
    expect(printFailurePage.close).toHaveBeenCalledOnce();
  });
});
