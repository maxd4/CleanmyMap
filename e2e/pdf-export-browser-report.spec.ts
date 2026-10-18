import path from "node:path";
import { build } from "vite";
import { expect, test } from "@playwright/test";

let browserReportBundle: string;

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    resolve: { alias: { "@": path.resolve("apps/web/src") } },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: path.resolve("apps/web/src/lib/pdf-export/browser-report.ts"),
        formats: ["iife"],
        name: "CmmPdfExport",
      },
    },
  });
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
  const bundle = outputs.find((item) => item.type === "chunk");
  if (!bundle || bundle.type !== "chunk") throw new Error("Le bundle du renderer PDF est introuvable.");
  browserReportBundle = bundle.code;
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
