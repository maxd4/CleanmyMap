import { useEffect, useMemo, useState } from "react";
import {
  buildPdfReportFilename,
  hasPdfReportData,
  type PdfReportData,
  type PdfReportPayload,
} from "@/lib/pdf-export/simple-pdf";
import { openPrintableReport, prepareReportWindow } from "@/lib/pdf-export/browser-report";
import { buildExportUiCopy } from "@/lib/reports/export-ui";
import { createClientIdentifier } from "@/lib/client-identifier";

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
  onGenerate?: (payload: PdfReportPayload, reportWindow?: Window | null) => void | Promise<void>;
  onExportSuccess?: (payload: PdfReportPayload) => void | Promise<void>;
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

    const reportWindow = typeof window === "undefined" ? null : prepareReportWindow();
    if (typeof window !== "undefined" && !reportWindow) {
      setState("error");
      setMessage("La fenêtre du rapport a été bloquée. Autorisez les fenêtres contextuelles puis réessayez.");
      return;
    }

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
        await params.onGenerate(payload, reportWindow);
      } else {
        const result = openPrintableReport(payload, filename, params.buildPrintableHtml, reportWindow);
        if (result === "blocked") {
          throw new Error("La fenêtre du rapport a été bloquée. Autorisez les fenêtres contextuelles puis réessayez.");
        }
      }

      await params.onExportSuccess?.(payload);

      const id = createClientIdentifier("CMM-PDF").toUpperCase();
      setHistory((prev) => [
        { id, rubrique: params.rubrique, filename, generatedAt },
        ...prev,
      ]);
      setState("success");
      setMessage("Rapport imprimable ouvert. Utilisez Enregistrer en PDF dans la fenêtre d'impression.");
    } catch (error) {
      reportWindow?.close();
      setState("error");
      setMessage(error instanceof Error ? error.message : copy.errorMessage);
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
