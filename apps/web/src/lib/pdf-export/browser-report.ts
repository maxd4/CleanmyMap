import {
  buildPdfReportLines,
  buildSimplePdf,
  type PdfReportPayload,
} from "./simple-pdf";
import { buildOfficialReportHtml } from "./official-report-html";

function downloadPdf(filename: string, lines: string[]): void {
  const bytes = buildSimplePdf(lines);
  const blob = new Blob(
    [(bytes.buffer as ArrayBuffer).slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)],
    { type: "application/pdf" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function renderReportWindow(
  reportWindow: Window,
  payload: PdfReportPayload,
): void {
  renderReportHtmlWindow(reportWindow, buildOfficialReportHtml(payload));
}

export function renderReportHtmlWindow(reportWindow: Window, html: string): void {
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();
}

export function openReportWindow(payload: PdfReportPayload): boolean {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return false;

  renderReportWindow(reportWindow, payload);
  return true;
}

export function openOrDownloadReport(
  payload: PdfReportPayload,
  filename: string,
  buildPrintableHtml?: (payload: PdfReportPayload) => string,
): "opened" | "downloaded" {
  const html = buildPrintableHtml
    ? buildPrintableHtml(payload)
    : buildOfficialReportHtml(payload);
  const reportWindow = window.open("", "_blank");
  if (reportWindow) {
    renderReportHtmlWindow(reportWindow, html);
    return "opened";
  }

  downloadPdf(filename, buildPdfReportLines(payload));
  return "downloaded";
}
