import createDOMPurify from "dompurify";
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

type PrintableWindowOptions = {
  autoPrint?: boolean;
  closeAfterPrint?: boolean;
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
  renderReportHtmlWindow(reportWindow, buildOfficialReportHtml(payload, options), {
    autoPrint: !payload.data.chapters?.length,
  });
}

function renderReportHtmlWindow(
  reportWindow: Window,
  html: string,
  options: PrintableWindowOptions = {},
): void {
  // HTML is produced by the report builders, which escape dynamic values for
  // their target contexts. DOMPurify is the final boundary for custom/export
  // HTML before it becomes a navigable document; in particular, it removes
  // scripts and event-handler attributes without losing print CSS, tables or
  // the SVG route map.
  const purifier = createDOMPurify(
    reportWindow as unknown as Parameters<typeof createDOMPurify>[0],
  );
  const safeHtml = purifier.isSupported
    ? purifier.sanitize(html, {
        WHOLE_DOCUMENT: true,
        FORBID_TAGS: ["script"],
      })
    : html;
  const documentUrl = URL.createObjectURL(
    new Blob([safeHtml], { type: "text/html;charset=UTF-8" }),
  );
  const handleLoad = () => {
    URL.revokeObjectURL(documentUrl);
    if (options.autoPrint) reportWindow.print();
  };
  reportWindow.addEventListener("load", handleLoad, { once: true });
  if (options.closeAfterPrint) {
    reportWindow.addEventListener("afterprint", () => reportWindow.close(), { once: true });
  }
  reportWindow.location.replace(documentUrl);
  reportWindow.focus();
}

export function openPrintableHtmlWindow(
  html: string,
  options: PrintableWindowOptions = { autoPrint: true, closeAfterPrint: true },
): boolean {
  const reportWindow = prepareReportWindow();
  if (!reportWindow) return false;

  renderReportHtmlWindow(reportWindow, html, options);
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

  renderReportHtmlWindow(targetWindow, html, {
    autoPrint: Boolean(buildPrintableHtml) || !payload.data.chapters?.length,
    closeAfterPrint: Boolean(buildPrintableHtml),
  });
  return "opened";
}
