import { useEffect, useMemo, useState } from "react";
import {
  buildPdfReportFilename,
  buildPdfReportLines,
  buildSimplePdf,
  hasPdfReportData,
  type PdfReportData,
  type PdfReportPayload,
} from "@/lib/pdf-export/simple-pdf";
import { buildOfficialReportHtml } from "@/lib/pdf-export/official-report-html";
import { buildExportUiCopy } from "@/lib/reports/export-ui";

export type ExportHistoryEntry = {
  id: string;
  rubrique: string;
  filename: string;
  generatedAt: string;
};

type UsePdfExportParams = {
  rubrique: string;
  periode: string;
  organizationType: string;
  defaultTitle: string;
  data?: PdfReportData | null;
  disabled?: boolean;
  onGenerate?: (payload: PdfReportPayload) => void | Promise<void>;
  buildPrintableHtml?: (payload: PdfReportPayload) => string;
};

const STORAGE_KEY = "cleanmymap.rubrique_export_history.v2";
const MAX_HISTORY = 12;

function readHistoryFromStorage(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExportHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .filter(
        (item) =>
          typeof item.id === "string" &&
          typeof item.rubrique === "string" &&
          typeof item.filename === "string" &&
          typeof item.generatedAt === "string",
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function writeHistoryToStorage(entries: ExportHistoryEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // Local storage can be unavailable in private or locked contexts.
  }
}

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

function openPrintableReport(html: string): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  return true;
}

export function usePdfExport(params: UsePdfExportParams) {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [history, setHistory] = useState<ExportHistoryEntry[]>(() => readHistoryFromStorage());

  const filename = useMemo(
    () => buildPdfReportFilename({ rubrique: params.rubrique, periode: params.periode }),
    [params.rubrique, params.periode],
  );
  const copy = useMemo(() => buildExportUiCopy({ format: "pdf", subject: "Rapport" }), []);
  const hasData = hasPdfReportData(params.data);
  const isDisabled = Boolean(params.disabled || !hasData || state === "pending");
  const title = customTitle.trim() || params.data?.title || params.defaultTitle;

  useEffect(() => {
    writeHistoryToStorage(history);
  }, [history]);

  async function exportRubriquePdf() {
    if (isDisabled) {
      setState("error");
      setMessage("Aucune donnée exploitable à exporter pour cette page.");
      return;
    }

    setState("pending");
    setMessage(null);

    const generatedAt = new Date().toISOString();
    const payload: PdfReportPayload = {
      title,
      rubrique: params.rubrique,
      periode: params.periode,
      organizationType: params.organizationType,
      organizationName,
      data: {
        ...params.data!,
        generatedAt,
      },
    };

    try {
      if (params.onGenerate) {
        await params.onGenerate(payload);
      } else {
        const printableHtml = params.buildPrintableHtml
          ? params.buildPrintableHtml(payload)
          : buildOfficialReportHtml(payload);
        const opened = openPrintableReport(printableHtml);
        if (!opened) {
          downloadPdf(filename, buildPdfReportLines(payload));
        }
      }

      const id = `CMM-PDF-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
      setHistory((prev) => [
        { id, rubrique: params.rubrique, filename, generatedAt },
        ...prev,
      ]);
      setState("success");
      setMessage("Rapport ouvert. Utilisez Enregistrer en PDF dans la fenêtre d'impression.");
    } catch {
      setState("error");
      setMessage(copy.errorMessage);
    }
  }

  return {
    state,
    message,
    customTitle,
    setCustomTitle,
    organizationName,
    setOrganizationName,
    history,
    filename,
    copy,
    hasData,
    isDisabled,
    exportRubriquePdf,
  };
}
