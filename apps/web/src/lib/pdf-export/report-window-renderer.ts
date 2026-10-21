import createDOMPurify from "dompurify";
import { escapeHtml } from "@/lib/security/html-escape";

export type PrintableWindowOptions = {
  autoPrint?: boolean;
  closeAfterPrint?: boolean;
  /** CSS is accepted only from a trusted in-repository printable generator. */
  trustedCss?: string;
};

const PRINTABLE_FRAGMENT_FORBID_TAGS = [
  "base", "embed", "form", "iframe", "input", "link", "meta", "object", "script",
  "textarea", "style", "body", "head", "html", "title",
];

const DEFAULT_PRINTABLE_WINDOW_OPTIONS = Object.freeze({
  autoPrint: true,
  closeAfterPrint: true,
});

export class PrintableReportDeliveryError extends Error {
  constructor() {
    super("Le document imprimable n'a pas pu être sécurisé ou chargé.");
    this.name = "PrintableReportDeliveryError";
  }
}

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

function sanitizePrintableHtml(reportWindow: Window, html: string, trustedCss?: string): string {
  const purifier = createDOMPurify(reportWindow as unknown as Parameters<typeof createDOMPurify>[0]);
  if (!purifier.isSupported) throw new PrintableReportDeliveryError();
  const sanitizedFragment = purifier.sanitize(html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ""), {
    WHOLE_DOCUMENT: false,
    FORBID_TAGS: PRINTABLE_FRAGMENT_FORBID_TAGS,
    FORBID_ATTR: ["style"],
  });
  if (typeof sanitizedFragment !== "string") throw new PrintableReportDeliveryError();
  const titleSource = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const safeTitle = escapeHtmlPreservingEntities(titleSource);
  const safeTrustedCss = trustedCss ? `<style>${trustedCss.replace(/<\/style/gi, "<\\/style")}</style>` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />${safeTrustedCss}<title>${safeTitle}</title></head><body>${sanitizedFragment}</body></html>`;
}

type PrintableWindowWatch = {
  reportWindow: Window;
  documentUrl: string;
  initialDocument: Document | null;
  options: PrintableWindowOptions;
  settled: boolean;
  observedDocument: Document | null;
  inspectListener: () => void;
  pollTimer: ReturnType<typeof setTimeout> | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
};

function clearWatchTimers(watch: PrintableWindowWatch): void {
  if (watch.pollTimer) clearTimeout(watch.pollTimer);
  if (watch.timeoutTimer) clearTimeout(watch.timeoutTimer);
  watch.pollTimer = null;
  watch.timeoutTimer = null;
}

function finishPrintableWindow(watch: PrintableWindowWatch, loadedDocument: Document): void {
  if (watch.settled) return;
  watch.settled = true;
  clearWatchTimers(watch);
  if (watch.options.closeAfterPrint) {
    watch.reportWindow.addEventListener("afterprint", () => watch.reportWindow.close(), { once: true });
  }
  try {
    if (watch.options.autoPrint) watch.reportWindow.print();
  } finally {
    URL.revokeObjectURL(watch.documentUrl);
  }
  void loadedDocument;
}

function failPrintableWindow(watch: PrintableWindowWatch): void {
  if (watch.settled) return;
  watch.settled = true;
  clearWatchTimers(watch);
  URL.revokeObjectURL(watch.documentUrl);
  watch.reportWindow.close();
}

function inspectPrintableWindow(watch: PrintableWindowWatch): void {
  if (watch.settled || watch.reportWindow.closed) {
    failPrintableWindow(watch);
    return;
  }

  let currentDocument: Document;
  let currentUrl: string;
  try {
    currentDocument = watch.reportWindow.document;
    currentUrl = watch.reportWindow.location.href;
  } catch {
    failPrintableWindow(watch);
    return;
  }

  if (currentDocument !== watch.observedDocument) {
    watch.observedDocument?.removeEventListener("DOMContentLoaded", watch.inspectListener);
    watch.observedDocument?.removeEventListener("readystatechange", watch.inspectListener);
    watch.observedDocument = currentDocument;
    currentDocument.addEventListener("DOMContentLoaded", watch.inspectListener);
    currentDocument.addEventListener("readystatechange", watch.inspectListener);
  }

  if (currentDocument !== watch.initialDocument && currentUrl === watch.documentUrl && currentDocument.readyState === "complete") {
    finishPrintableWindow(watch, currentDocument);
    return;
  }
  watch.pollTimer = setTimeout(() => inspectPrintableWindow(watch), 25);
}

function startPrintableWindowWatch(
  reportWindow: Window,
  documentUrl: string,
  initialDocument: Document | null,
  options: PrintableWindowOptions,
): void {
  const watch = {} as PrintableWindowWatch;
  Object.assign(watch, {
    reportWindow,
    documentUrl,
    initialDocument,
    options,
    settled: false,
    observedDocument: null,
    inspectListener: () => inspectPrintableWindow(watch),
    pollTimer: null,
    timeoutTimer: null,
  });
  watch.timeoutTimer = setTimeout(() => failPrintableWindow(watch), 30_000);
  inspectPrintableWindow(watch);
  if (!reportWindow.closed) reportWindow.focus();
}

export function renderReportHtmlWindow(
  reportWindow: Window,
  html: string,
  options: PrintableWindowOptions = {},
): void {
  let safeHtml: string;
  try {
    safeHtml = sanitizePrintableHtml(reportWindow, html, options.trustedCss);
  } catch (error) {
    reportWindow.close();
    if (error instanceof PrintableReportDeliveryError) throw error;
    throw new PrintableReportDeliveryError();
  }

  let documentUrl: string;
  try {
    documentUrl = URL.createObjectURL(new Blob([safeHtml], { type: "text/html;charset=UTF-8" }));
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

  startPrintableWindowWatch(reportWindow, documentUrl, initialDocument, options);
}

export function getDefaultPrintableWindowOptions(): PrintableWindowOptions {
  return DEFAULT_PRINTABLE_WINDOW_OPTIONS;
}
