import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { createDOMPurifyMock } = vi.hoisted(() => ({
  createDOMPurifyMock: vi.fn(),
}));
vi.mock("dompurify", () => ({ default: createDOMPurifyMock }));

import {
  IncompatibleReportRendererError,
  openPrintableHtmlWindow,
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

function createFakeDocument(readyState: DocumentReadyState) {
  const listeners = new Map<string, Set<() => void>>();
  let currentReadyState = readyState;
  const document = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn((type: string, listener: () => void) => {
        const registered = listeners.get(type) ?? new Set<() => void>();
        registered.add(listener);
        listeners.set(type, registered);
      }),
      removeEventListener: vi.fn((type: string, listener: () => void) => {
        listeners.get(type)?.delete(listener);
      }),
      dispatch: (type: string) => {
        listeners.get(type)?.forEach((listener) => listener());
      },
      get readyState() {
        return currentReadyState;
      },
      setReadyState: (next: DocumentReadyState) => {
        currentReadyState = next;
      },
    };
  return document as unknown as Document & {
    dispatch: (type: string) => void;
    setReadyState: (next: DocumentReadyState) => void;
  };
}

function createReportWindow(loadImmediately = true) {
  const initialDocument = createFakeDocument("complete");
  const loadedDocument = createFakeDocument(loadImmediately ? "complete" : "loading");
  let currentDocument = initialDocument;
  let closed = false;
  const windowListeners = new Map<string, Set<() => void>>();
  const location = {
    href: "about:blank",
    replace: vi.fn((url: string) => {
      location.href = url;
      currentDocument = loadedDocument;
    }),
  };
  const reportWindow = {
    get document() {
      return currentDocument;
    },
    location,
    addEventListener: vi.fn((type: string, listener: () => void) => {
      const registered = windowListeners.get(type) ?? new Set<() => void>();
      registered.add(listener);
      windowListeners.set(type, registered);
    }),
    dispatchWindowEvent: (type: string) => {
      windowListeners.get(type)?.forEach((listener) => listener());
    },
    print: vi.fn(),
    close: vi.fn(() => {
      closed = true;
    }),
    get closed() {
      return closed;
    },
    focus: vi.fn(),
  };
  return {
    reportWindow: reportWindow as unknown as Window,
    loadedDocument,
    dispatchWindowEvent: reportWindow.dispatchWindowEvent,
  };
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
  beforeEach(() => {
    createDOMPurifyMock.mockReturnValue({
      isSupported: true,
      sanitize: vi.fn((html: string) => html),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    createDOMPurifyMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("renders the official printable HTML in the pre-opened window without document.write", async () => {
    const { reportWindow } = createReportWindow();
    const open = vi.fn().mockReturnValue(reportWindow);
    vi.stubGlobal("window", { open });
    const { createObjectURL, revokeObjectURL } = stubObjectUrl();

    const result = openPrintableReport(payload, "rapport_test.pdf");

    expect(result).toBe("opened");
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(reportWindow.document.write).not.toHaveBeenCalled();
    expect(reportWindow.location.replace).toHaveBeenCalledWith("blob:report-preview");
    await expect(createdHtml(createObjectURL)).resolves.toContain("Résumé fidèle.");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report-preview");
    expect(reportWindow.focus).toHaveBeenCalledTimes(1);
  });

  it("refuses delivery when the popup is blocked instead of downloading a lossy fallback", () => {
    const open = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", { open });

    expect(openPrintableReport(payload, "rapport_test.pdf")).toBe("blocked");
    expect(open).toHaveBeenCalledWith("", "_blank");
  });

  it("uses an already opened window without attempting a second popup", async () => {
    const { reportWindow } = createReportWindow();
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
    const { reportWindow } = createReportWindow();
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
    const { reportWindow } = createReportWindow();
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

  it("fails closed when DOMPurify is unavailable or throws", () => {
    const unsupported = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(unsupported.reportWindow) });
    const { createObjectURL } = stubObjectUrl();
    createDOMPurifyMock.mockReturnValueOnce({ isSupported: false, sanitize: vi.fn() });

    expect(openPrintableHtmlWindow("<script>alert(1)</script>")).toBe(false);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(unsupported.reportWindow.close).toHaveBeenCalledTimes(1);

    const throwing = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(throwing.reportWindow) });
    createDOMPurifyMock.mockReturnValueOnce({
      isSupported: true,
      sanitize: vi.fn(() => {
        throw new Error("sanitizer unavailable");
      }),
    });

    expect(openPrintableReport(payload, "rapport_test.pdf")).toBe("blocked");
    expect(throwing.reportWindow.location.replace).not.toHaveBeenCalled();
    expect(throwing.reportWindow.close).toHaveBeenCalledTimes(1);
  });

  it("places only sanitized HTML in the Blob for hostile markup", async () => {
    const { reportWindow } = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    const { createObjectURL } = stubObjectUrl();
    const hostileHtml = '<!doctype html><html><body><h1 title="&quot; onmouseover=&quot;alert(1)">Titre</h1><img src="x" onerror="alert(1)"><script>window.xss = true</script></body></html>';
    const sanitize = vi.fn((fragment: string, options?: { WHOLE_DOCUMENT?: boolean }) => {
      expect(options?.WHOLE_DOCUMENT).toBe(false);
      return fragment.includes("<script") ? "<h1>Titre</h1>" : fragment;
    });
    createDOMPurifyMock.mockReturnValueOnce({
      isSupported: true,
      sanitize,
    });

    expect(openPrintableHtmlWindow(hostileHtml, { autoPrint: false })).toBe(true);

    const sanitizedHtml = await createdHtml(createObjectURL);
    expect(sanitizedHtml).toContain("Titre");
    expect(sanitizedHtml).not.toContain("<script");
    expect(sanitizedHtml).not.toMatch(/\bonerror\s*=/i);
    expect(sanitizedHtml).not.toMatch(/\bonmouseover\s*=/i);
    expect(sanitize).toHaveBeenCalledOnce();
    expect(sanitize.mock.calls.every(([, options]) => options?.WHOLE_DOCUMENT === false)).toBe(true);
  });

  it("keeps escaped report titles as text in the fixed document shell", async () => {
    const { reportWindow } = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    const { createObjectURL } = stubObjectUrl();

    expect(openPrintableHtmlWindow("<html><head><title>A &amp; B</title></head><body>Rapport</body></html>", { autoPrint: false })).toBe(true);

    const printableHtml = await createdHtml(createObjectURL);
    expect(printableHtml).toContain("<title>A &amp; B</title>");
    expect(printableHtml).not.toContain("A &amp;amp; B");
  });

  it("does not print before the navigated document is complete", () => {
    vi.useFakeTimers();
    const { reportWindow, loadedDocument } = createReportWindow(false);
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    stubObjectUrl();

    expect(openPrintableHtmlWindow("<html><body>Rapport</body></html>", { autoPrint: true })).toBe(true);
    expect(reportWindow.print).not.toHaveBeenCalled();

    loadedDocument.setReadyState("complete");
    loadedDocument.dispatch("readystatechange");
    expect(reportWindow.print).toHaveBeenCalledTimes(1);
  });

  it("closes after print when requested and keeps the window open otherwise", () => {
    const closing = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(closing.reportWindow) });
    stubObjectUrl();
    expect(openPrintableHtmlWindow("<html><body>Rapport</body></html>")).toBe(true);
    expect(closing.reportWindow.close).not.toHaveBeenCalled();
    closing.dispatchWindowEvent("afterprint");
    expect(closing.reportWindow.close).toHaveBeenCalledTimes(1);

    const retained = createReportWindow();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(retained.reportWindow) });
    stubObjectUrl();
    expect(openPrintableHtmlWindow("<html><body>Rapport</body></html>", { autoPrint: true, closeAfterPrint: false })).toBe(true);
    retained.dispatchWindowEvent("afterprint");
    expect(retained.reportWindow.close).not.toHaveBeenCalled();
  });
});
