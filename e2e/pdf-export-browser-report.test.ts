import path from "node:path";
import { build } from "vite";
import { expect, test } from "@playwright/test";

let browserReportBundle: string;
let exportFormBundle: string;
let printTemplateBundle: string;
const LOCAL_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

function isLocalGoogleFontRequest(value: string): boolean {
  try {
    return LOCAL_FONT_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function buildBrowserBundle(entry: string, name: string): Promise<string> {
  const result = await build({
    configFile: false,
    resolve: { alias: { "@": path.resolve("apps/web/src") } },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: path.resolve(entry),
        formats: ["iife"],
        name,
      },
    },
  });
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
  const bundle = outputs.find((item) => item.type === "chunk");
  if (!bundle || bundle.type !== "chunk") throw new Error(`Le bundle ${name} est introuvable.`);
  return bundle.code;
}

test.beforeAll(async () => {
  [browserReportBundle, exportFormBundle, printTemplateBundle] = await Promise.all([
    buildBrowserBundle("apps/web/src/lib/pdf-export/browser-report.ts", "CmmPdfExport"),
    buildBrowserBundle("apps/web/src/lib/actions/exports/export-form-pdf.ts", "CmmFormPdfExport"),
    buildBrowserBundle("apps/web/src/lib/pdf-export/generate-pdf-html.templates.ts", "CmmPrintTemplates"),
  ]);
});

test("accepts only exact Google font hosts", () => {
  expect(isLocalGoogleFontRequest("https://fonts.googleapis.com/css2?family=Inter")).toBe(true);
  expect(isLocalGoogleFontRequest("https://fonts.gstatic.com/s/inter.woff2")).toBe(true);
  expect(isLocalGoogleFontRequest("https://fonts.googleapis.com.evil.example/track")).toBe(false);
  expect(isLocalGoogleFontRequest("not a URL")).toBe(false);
});

test("prints only after the navigated Blob document has completed loading", async ({ page }) => {
  await page.context().addInitScript(() => {
    const state = { count: 0, readyStateAtPrint: null as DocumentReadyState | null };
    Object.defineProperty(window, "__cmmPdfPrintState", { value: state, configurable: true });
    window.print = () => {
      state.count += 1;
      state.readyStateAtPrint = document.readyState;
    };
  });
  await page.goto("/");
  await page.addScriptTag({ content: browserReportBundle });

  const popupPromise = page.waitForEvent("popup");
  const opened = await page.evaluate(() => {
    const api = (window as unknown as {
      CmmPdfExport: { openPrintableHtmlWindow: (html: string, options: { autoPrint: boolean; closeAfterPrint: boolean }) => boolean };
    }).CmmPdfExport;
    return api.openPrintableHtmlWindow(
      '<!doctype html><html><head><title>Rapport sûr</title></head><body><h1 onclick="window.__xss = true">Rapport imprimable</h1><img src="invalid:" onerror="window.__xss = true"><script>window.__xss = true</script></body></html>',
      { autoPrint: true, closeAfterPrint: false },
    );
  });

  expect(opened).toBe(true);
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  await expect.poll(() => popup.evaluate(() => (window as unknown as { __cmmPdfPrintState?: { count: number } }).__cmmPdfPrintState?.count ?? 0)).toBe(1);

  const result = await popup.evaluate(() => ({
    readyState: document.readyState,
    readyStateAtPrint: (window as unknown as { __cmmPdfPrintState: { readyStateAtPrint: DocumentReadyState | null } }).__cmmPdfPrintState.readyStateAtPrint,
    title: document.title,
    scripts: document.scripts.length,
    eventHandlers: document.querySelectorAll("[onclick], [onerror]").length,
    urlProtocol: window.location.protocol,
  }));
  expect(result.readyState).toBe("complete");
  expect(result.readyStateAtPrint).toBe("complete");
  expect(result.title).toBe("Rapport sûr");
  expect(result.scripts).toBe(0);
  expect(result.eventHandlers).toBe(0);
  expect(result.urlProtocol).toBe("blob:");
  await popup.close();
});

test("keeps the form and report print outputs local and A4", async ({ page }) => {
  const googleFontRequests: string[] = [];
  page.context().on("request", (request) => {
    if (isLocalGoogleFontRequest(request.url())) {
      googleFontRequests.push(request.url());
    }
  });

  await page.addInitScript(() => {
    window.print = () => undefined;
    window.close = () => undefined;
  });
  await page.goto("/");
  await page.addScriptTag({ content: exportFormBundle });
  await page.addScriptTag({ content: printTemplateBundle });

  const popupPromise = page.waitForEvent("popup");
  const reportStyles = await page.evaluate(() => {
    const api = (window as unknown as {
      CmmPrintTemplates: { buildPdfPrintStyles: () => string };
    }).CmmPrintTemplates;
    const styles = api.buildPdfPrintStyles();
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);
    const probe = document.createElement("div");
    probe.textContent = "Rapport A4";
    document.body.appendChild(probe);
    return {
      styles,
      fontFamily: getComputedStyle(probe).fontFamily,
    };
  });

  const opened = await page.evaluate(() => {
    const api = (window as unknown as {
      CmmFormPdfExport: {
        exportFormAsPdf: (form: Record<string, string>, actorName: string) => boolean;
      };
    }).CmmFormPdfExport;
    const printableWindow = window.open("", "_blank");
    if (!printableWindow) return false;
    const originalOpen = window.open;
    Object.defineProperty(window, "open", {
      configurable: true,
      value: () => printableWindow,
    });
    try {
      return api.exportFormAsPdf(
        {
          actionDate: "2026-08-23",
          arrivalLocationLabel: "Place de la République",
          associationName: "CleanMyMap",
          departureLocationLabel: "Canal Saint-Martin",
          durationMinutes: "90",
          latitude: "48.8566",
          locationLabel: "Paris 10e",
          longitude: "2.3522",
          notes: "Notes de terrain",
          placeType: "Espace public",
          recordType: "action",
          volunteersCount: "12",
          wasteKg: "18.5",
          wasteMegotsKg: "2.1",
        },
        "Camille Martin",
      );
    } finally {
      Object.defineProperty(window, "open", {
        configurable: true,
        value: originalOpen,
      });
    }
  });
  expect(opened).toBe(true);

  const printable = await popupPromise;
  await printable.waitForLoadState("load");
  const printableState = await printable.evaluate(() => ({
    styles: Array.from(document.querySelectorAll("style"), (style) => style.textContent ?? "").join("\n"),
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    bodyText: document.body.textContent ?? "",
    html: (() => {
      document.querySelectorAll("script").forEach((script) => script.remove());
      return document.documentElement.outerHTML;
    })(),
  }));
  const renderPage = await page.context().newPage();
  await renderPage.setContent(printableState.html, { waitUntil: "load" });
  const pdf = await renderPage.pdf({ format: "A4", printBackground: true });

  expect(reportStyles.styles).toContain("@page { size: A4; margin: 0; }");
  expect(reportStyles.styles).not.toContain("fonts.googleapis.com");
  expect(reportStyles.styles).not.toContain("fonts.gstatic.com");
  expect(reportStyles.fontFamily).toContain("Segoe UI");
  expect(printableState.styles).toContain("@page { size: A4; margin: 20mm 18mm; }");
  expect(printableState.styles).not.toContain("fonts.googleapis.com");
  expect(printableState.styles).not.toContain("fonts.gstatic.com");
  expect(printableState.bodyFontFamily).toContain("Segoe UI");
  expect(printableState.bodyText).toContain("Déclaration d'action");
  expect(String.fromCharCode(...pdf.subarray(0, 5))).toBe("%PDF-");
  expect(pdf.byteLength).toBeGreaterThan(1_000);
  expect(googleFontRequests).toEqual([]);

  await renderPage.close();
  await printable.close();
});
