import type { PdfReportPayload } from "./simple-pdf";
import { buildOfficialReportHtml } from "./official-report-html";

export function prepareReportWindow(): Window | null {
  return window.open("", "_blank");
}

export function renderReportWindow(
  reportWindow: Window,
  payload: PdfReportPayload,
): void {
  renderReportHtmlWindow(reportWindow, buildOfficialReportHtml(payload));
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
): "opened" | "blocked" {
  const html = buildPrintableHtml
    ? buildPrintableHtml(payload)
    : buildOfficialReportHtml(payload);
  const targetWindow = reportWindow ?? prepareReportWindow();
  if (!targetWindow) return "blocked";

  renderReportHtmlWindow(targetWindow, html);
  return "opened";
}
