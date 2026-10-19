import createDOMPurify from "dompurify";
import { escapeHtml } from "@/lib/security/html-escape";
import type { PdfReportPayload } from "./simple-pdf";
import { buildOfficialReportHtml } from "./official-report-html";
import type { ReportPdfTheme } from "./report-pdf-theme";
import {
  REPORT_RENDERER_VERSION,
  REPORT_TEMPLATE_VERSION,
} from "@/lib/reports/report-generation-snapshot";

export type ReportBrowserRenderOptions = {
  autoPrint?: boolean;
  theme?: ReportPdfTheme;
};

type PrintableWindowOptions = {
  autoPrint?: boolean;
  closeAfterPrint?: boolean;
};

const PRINTABLE_FRAGMENT_FORBID_TAGS = [
  "base",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "textarea",
  "body",
  "head",
  "html",
  "title",
];

const DEFAULT_PRINTABLE_WINDOW_OPTIONS = Object.freeze({
  autoPrint: true,
  closeAfterPrint: true,
});

function escapeHtmlPreservingEntities(value: string): string {
  const entities: string[] = [];
  const protectedValue = value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => {
    const marker = `__CMM_HTML_ENTITY_${entities.length}__`;
    entities.push(entity);
    return marker;
  });
  const escaped = escapeHtml(protectedValue);
  return escaped.replace(/__CMM_HTML_ENTITY_(\d+)__/g, (_marker, index: string) => entities[Number(index)] ?? "");
}

function sanitizePrintableHtml(reportWindow: Window, html: string): string {
  const purifier = createDOMPurify(
    reportWindow as unknown as Parameters<typeof createDOMPurify>[0],
  );
  if (!purifier.isSupported) throw new PrintableReportDeliveryError();

  const sanitizeFragment = (fragment: string): string => {
    const sanitized = purifier.sanitize(fragment, {
      WHOLE_DOCUMENT: false,
      FORBID_TAGS: PRINTABLE_FRAGMENT_FORBID_TAGS,
    });
    if (typeof sanitized !== "string") throw new PrintableReportDeliveryError();
    return sanitized;
  };

  const titleSource = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const safeTitle = escapeHtmlPreservingEntities(titleSource);
  const safeFragment = sanitizeFragment(html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ""));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${safeTitle}</title></head><body>${safeFragment}</body></html>`;
}

export class IncompatibleReportRendererError extends Error {
  constructor() {
    super("Le template ou le renderer enregistré pour ce rapport n'est plus disponible.");
    this.name = "IncompatibleReportRendererError";
  }
}

export class PrintableReportDeliveryError extends Error {
  constructor() {
    super("Le document imprimable n'a pas pu être sécurisé ou chargé.");
    this.name = "PrintableReportDeliveryError";
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
    autoPrint: options.autoPrint ?? !payload.data.chapters?.length,
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
  let safeHtml: string;
  try {
    safeHtml = sanitizePrintableHtml(reportWindow, html);
  } catch (error) {
    reportWindow.close();
    if (error instanceof PrintableReportDeliveryError) throw error;
    throw new PrintableReportDeliveryError();
  }

  let documentUrl: string;
  try {
    documentUrl = URL.createObjectURL(
      new Blob([safeHtml], { type: "text/html;charset=UTF-8" }),
    );
  } catch {
    reportWindow.close();
    throw new PrintableReportDeliveryError();
  }

  let initialDocument: Document | null = null;
  try {
    initialDocument = reportWindow.document;
    reportWindow.location.replace(documentUrl);
  } catch {
    URL.revokeObjectURL(documentUrl);
    reportWindow.close();
    throw new PrintableReportDeliveryError();
  }

  let settled = false;
  let observedDocument: Document | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (pollTimer) clearTimeout(pollTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    pollTimer = null;
    timeoutTimer = null;
  };

  const finish = (loadedDocument: Document) => {
    if (settled) return;
    settled = true;
    clearTimers();
    if (options.closeAfterPrint) {
      reportWindow.addEventListener("afterprint", () => reportWindow.close(), { once: true });
    }
    try {
      if (options.autoPrint) reportWindow.print();
    } finally {
      URL.revokeObjectURL(documentUrl);
    }
    void loadedDocument;
  };

  const fail = () => {
    if (settled) return;
    settled = true;
    clearTimers();
    URL.revokeObjectURL(documentUrl);
    reportWindow.close();
  };

  const inspectLoadedDocument = () => {
    if (settled || reportWindow.closed) {
      fail();
      return;
    }

    let currentDocument: Document;
    let currentUrl: string;
    try {
      currentDocument = reportWindow.document;
      currentUrl = reportWindow.location.href;
    } catch {
      fail();
      return;
    }

    if (currentDocument !== observedDocument) {
      observedDocument?.removeEventListener("DOMContentLoaded", inspectLoadedDocument);
      observedDocument?.removeEventListener("readystatechange", inspectLoadedDocument);
      observedDocument = currentDocument;
      currentDocument.addEventListener("DOMContentLoaded", inspectLoadedDocument);
      currentDocument.addEventListener("readystatechange", inspectLoadedDocument);
    }

    if (
      currentDocument !== initialDocument &&
      currentUrl === documentUrl &&
      currentDocument.readyState === "complete"
    ) {
      finish(currentDocument);
      return;
    }

    pollTimer = setTimeout(inspectLoadedDocument, 25);
  };

  timeoutTimer = setTimeout(fail, 30_000);
  inspectLoadedDocument();
  if (!reportWindow.closed) reportWindow.focus();
}

export function openPrintableHtmlWindow(
  html: string,
  options: PrintableWindowOptions = DEFAULT_PRINTABLE_WINDOW_OPTIONS,
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
  const html = buildPrintableHtml
    ? buildPrintableHtml(payload)
    : buildOfficialReportHtml(payload, options);
  const targetWindow = reportWindow ?? prepareReportWindow();
  if (!targetWindow) return "blocked";

  try {
    renderReportHtmlWindow(targetWindow, html, {
      autoPrint: options.autoPrint ?? (Boolean(buildPrintableHtml) || !payload.data.chapters?.length),
      closeAfterPrint: Boolean(buildPrintableHtml),
    });
  } catch (error) {
    if (!(error instanceof PrintableReportDeliveryError)) throw error;
    return "blocked";
  }
  return "opened";
}
