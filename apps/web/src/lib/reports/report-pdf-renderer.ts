import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { buildOfficialReportHtml } from "@/lib/pdf-export/official-report-html";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import type { ReportPdfArtifactTheme } from "./report-generation-pdf-artifact-store";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.executablePath().then((executablePath) =>
      puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: true,
      }),
    ).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

export async function renderOfficialReportPdf(params: {
  payload: PdfReportPayload;
  theme: ReportPdfArtifactTheme;
}): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    const html = buildOfficialReportHtml(params.payload, { theme: params.theme });
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("print");
    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    return Buffer.from(bytes);
  } finally {
    await page.close();
  }
}
