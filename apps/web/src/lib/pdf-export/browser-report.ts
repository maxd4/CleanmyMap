import type { PdfReportPayload } from "./simple-pdf";
import { buildOfficialReportHtml } from "./official-report-html";
import { buildOfficialReportCss, type ReportPdfTheme } from "./report-pdf-theme";
import {
  REPORT_RENDERER_VERSION,
  REPORT_TEMPLATE_VERSION,
} from "@/lib/reports/report-generation-snapshot";
import {
  getDefaultPrintableWindowOptions,
  PrintableReportDeliveryError,
  renderReportHtmlWindow,
  type PrintableWindowOptions,
} from "./report-window-renderer";

export type ReportBrowserRenderOptions = {
  autoPrint?: boolean;
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
  if (!metadata) return;
  if (metadata.templateVersion !== REPORT_TEMPLATE_VERSION || metadata.rendererVersion !== REPORT_RENDERER_VERSION) {
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
  renderReportHtmlWindow(reportWindow, buildOfficialReportHtml(payload, options), {
    autoPrint: options.autoPrint ?? !payload.data.chapters?.length,
    trustedCss: buildOfficialReportCss(options.theme),
  });
}

export function openPrintableHtmlWindow(
  html: string,
  options: PrintableWindowOptions = getDefaultPrintableWindowOptions(),
): boolean {
  const reportWindow = prepareReportWindow();
  if (!reportWindow) return false;
  try {
    renderReportHtmlWindow(reportWindow, html, options);
    return true;
  } catch (error) {
    if (!(error instanceof PrintableReportDeliveryError)) throw error;
    return false;
  }
}

export function openPrintableReport(
  payload: PdfReportPayload,
  _filename: string,
  buildPrintableHtml?: (payload: PdfReportPayload) => string,
  reportWindow?: Window | null,
  options: ReportBrowserRenderOptions = {},
): "opened" | "blocked" {
  assertReportRendererCompatibility(payload);
  const html = buildPrintableHtml ? buildPrintableHtml(payload) : buildOfficialReportHtml(payload, options);
  const targetWindow = reportWindow ?? prepareReportWindow();
  if (!targetWindow) return "blocked";
  try {
    renderReportHtmlWindow(targetWindow, html, {
      autoPrint: options.autoPrint ?? (Boolean(buildPrintableHtml) || !payload.data.chapters?.length),
      closeAfterPrint: Boolean(buildPrintableHtml),
      trustedCss: buildPrintableHtml ? undefined : buildOfficialReportCss(options.theme),
    });
  } catch (error) {
    if (!(error instanceof PrintableReportDeliveryError)) throw error;
    return "blocked";
  }
  return "opened";
}
