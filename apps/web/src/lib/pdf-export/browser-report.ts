import type { PdfReportPayload } from "./simple-pdf";
import { buildOfficialReportHtml } from "./official-report-html";
import type { ReportPdfTheme } from "./report-pdf-theme";
import {
  REPORT_RENDERER_VERSION,
  REPORT_TEMPLATE_VERSION,
} from "@/lib/reports/report-generation-snapshot";

export type ReportBrowserRenderOptions = {
  theme?: ReportPdfTheme;
};

export class IncompatibleReportRendererError extends Error {
  constructor() {
    super("Le template ou le renderer enregistré pour ce rapport n'est plus disponible.");
    this.name = "IncompatibleReportRendererError";
  }
}

export function assertReportRendererCompatibility(payload: PdfReportPayload): void {
  const metadata = payload.snapshotMetadata;
  if (!metadata) {
    // Legacy snapshots have no renderer identity; their payload shape is the
    // compatibility contract handled by the official renderer.
    return;
  }
  if (metadata.templateVersion !== REPORT_TEMPLATE_VERSION ||
    metadata.rendererVersion !== REPORT_RENDERER_VERSION) {
    throw new IncompatibleReportRendererError();
  }
}

export function prepareReportWindow(): Window | null {
  return window.open("", "_blank");
}

export function renderReportWindow(
  reportWindow: Window,
  payload: PdfReportPayload,
  options: ReportBrowserRenderOptions = {},
): void {
  assertReportRendererCompatibility(payload);
  renderReportHtmlWindow(reportWindow, buildOfficialReportHtml(payload, options));
}

function renderReportHtmlWindow(reportWindow: Window, html: string): void {
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();
}

export function openPrintableHtmlWindow(html: string): boolean {
  const reportWindow = prepareReportWindow();
  if (!reportWindow) return false;

  renderReportHtmlWindow(reportWindow, html);
  return true;
}

export function openPrintableReport(
  payload: PdfReportPayload,
  _filename: string,
  buildPrintableHtml?: (payload: PdfReportPayload) => string,
  reportWindow?: Window | null,
  options: ReportBrowserRenderOptions = {},
): "opened" | "blocked" {
  assertReportRendererCompatibility(payload);
  const html = buildPrintableHtml
    ? buildPrintableHtml(payload)
    : buildOfficialReportHtml(payload, options);
  const targetWindow = reportWindow ?? prepareReportWindow();
  if (!targetWindow) return "blocked";

  renderReportHtmlWindow(targetWindow, html);
  return "opened";
}
