import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOfficialReportCss } from "./report-pdf-theme";
import { buildOfficialReportHtml } from "./official-report-html";
import { openPrintableHtmlWindow } from "./browser-report";
import type { PdfReportPayload } from "./simple-pdf";

const payload = {
  title: "Rapport officiel",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  data: {
    summary: ["Résumé officiel."],
    generatedAt: "2026-06-01T12:00:00.000Z",
  },
} satisfies PdfReportPayload;

function createRealDomReportWindow() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  const loadedDom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  const initialDocument = dom.window.document;
  const loadedDocument = loadedDom.window.document;
  let currentDocument = initialDocument;
  let closed = false;
  const listeners = new Map<string, Set<() => void>>();
  const location = {
    href: "about:blank",
    replace: vi.fn((url: string) => {
      location.href = url;
      currentDocument = loadedDocument;
    }),
  };
  const reportWindow = Object.create(dom.window) as Window & {
    dispatchWindowEvent: (type: string) => void;
  };

  Object.defineProperties(reportWindow, {
    document: { configurable: true, get: () => currentDocument },
    location: { configurable: true, value: location },
    closed: { configurable: true, get: () => closed },
    addEventListener: {
      configurable: true,
      value: vi.fn((type: string, listener: () => void) => {
        const registered = listeners.get(type) ?? new Set<() => void>();
        registered.add(listener);
        listeners.set(type, registered);
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(() => {
        closed = true;
      }),
    },
    focus: { configurable: true, value: vi.fn() },
    print: { configurable: true, value: vi.fn() },
  });
  reportWindow.dispatchWindowEvent = (type) => {
    listeners.get(type)?.forEach((listener) => listener());
  };

  return { reportWindow, location, print: reportWindow.print as unknown as ReturnType<typeof vi.fn> };
}

function stubObjectUrl() {
  const createObjectURL = vi.fn(() => "blob:real-dom-report");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

async function readCreatedHtml(createObjectURL: ReturnType<typeof vi.fn>): Promise<string> {
  const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
  if (!blob) throw new Error("Aucun document imprimable n'a été créé.");
  return blob.text();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser report sanitization with the real DOMPurify runtime", () => {
  it.each([
    ["impact", "linear-gradient"],
    ["scientific", 'data-report-theme="scientific"'],
  ] as const)("keeps the official %s CSS in the final Blob", async (theme, marker) => {
    const { reportWindow, print } = createRealDomReportWindow();
    const { createObjectURL, revokeObjectURL } = stubObjectUrl();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });
    const officialHtml = buildOfficialReportHtml(payload, { theme });
    const hostileMarkup = '<table><tbody><tr><td>Tableau autorisé</td></tr></tbody></table><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg><div style="color:red" onmouseover="alert(1)">Texte</div><style>body{background:red}</style><script>alert(1)</script>';
    const html = officialHtml.replace("</body>", `${hostileMarkup}</body>`);

    expect(openPrintableHtmlWindow(html, { autoPrint: false, trustedCss: buildOfficialReportCss(theme) })).toBe(true);

    const printableHtml = await readCreatedHtml(createObjectURL);
    expect(printableHtml).toContain(marker);
    expect(printableHtml).toContain('@page { size: A4 portrait;');
    expect(printableHtml).toContain("Tableau autorisé");
    expect(printableHtml).toContain("<svg");
    expect(printableHtml).not.toContain("<script");
    expect(printableHtml).not.toMatch(/\bonmouseover\s*=/i);
    expect(printableHtml).not.toContain("style=\"color:red\"");
    expect(printableHtml).not.toContain("body{background:red}");
    expect(printableHtml).not.toContain("alert(1)");
    expect(printableHtml).not.toContain("javascript:");
    expect(printableHtml).not.toContain("&amp;amp;");
    expect(print).not.toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:real-dom-report");
  });

  it("keeps an already escaped title escaped once in the real sanitized Blob", async () => {
    const { reportWindow } = createRealDomReportWindow();
    const { createObjectURL } = stubObjectUrl();
    vi.stubGlobal("window", { open: vi.fn().mockReturnValue(reportWindow) });

    expect(openPrintableHtmlWindow(
      "<!doctype html><html><head><title>A &amp; B</title></head><body>Rapport</body></html>",
      { autoPrint: false, trustedCss: buildOfficialReportCss("impact") },
    )).toBe(true);

    const printableHtml = await readCreatedHtml(createObjectURL);
    expect(printableHtml).toContain("<title>A &amp; B</title>");
    expect(printableHtml).not.toContain("A &amp;amp; B");
    expect(reportWindow.location.href).toBe("blob:real-dom-report");
  });
});
