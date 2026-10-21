import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { renderReportWindow, prepareReportWindow } from "@/lib/pdf-export/browser-report";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import { downloadHistoricalReportData, downloadOrShareReportPdf } from "@/components/reports/report-pdf-actions";
import type { ReportGenerationHistoryActionState } from "./web-document/reports-web-document-delivery";
import { deriveHistoricalReportSnapshot, loadHistoricalReportSnapshot } from "@/lib/reports/historical-report-client";
import { buildReportScientificReference } from "@/lib/reports/report-scientific-export";
import { replayHistoricalReport } from "@/lib/reports/historical-report-replay";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";

type HistoricalReplay = { reportWindow: Window; payload: PdfReportPayload };
type HistoryActionsParams = {
  reportTheme: ReportPdfTheme;
  refreshHistory: () => Promise<boolean>;
  setHistoryAvailability: Dispatch<SetStateAction<"available" | "unavailable">>;
  setDailyExportAvailability: Dispatch<SetStateAction<ReportExportAvailability>>;
  setHistoryActionStateById: Dispatch<SetStateAction<Record<string, ReportGenerationHistoryActionState>>>;
};
type HistoricalReplayRef = MutableRefObject<HistoricalReplay | null>;

function setActionState(params: HistoryActionsParams, id: string, state: ReportGenerationHistoryActionState): void {
  params.setHistoryActionStateById((current) => ({ ...current, [id]: state }));
}

async function handleReexport(params: HistoryActionsParams, id: string, action: ReportGenerationHistoryActionState["action"], theme: ReportPdfTheme): Promise<void> {
  try {
    const result = await downloadOrShareReportPdf({ generationId: id, theme });
    setActionState(params, id, { action, state: "success", message: result === "shared" ? "Le fichier PDF a été transmis au partage natif. Aucun nouveau quota n’a été consommé." : "Le fichier PDF a été téléchargé depuis le snapshot enregistré. Aucun nouveau quota n’a été consommé." });
  } catch (error) {
    setActionState(params, id, { action, state: "error", message: error instanceof Error ? error.message : "Impossible de télécharger le PDF historique." });
  }
}

async function handleReference(params: HistoryActionsParams, id: string, action: ReportGenerationHistoryActionState["action"]): Promise<void> {
  try {
    const generation = await loadHistoricalReportSnapshot(id);
    if (!navigator.clipboard?.writeText) throw new Error("La copie dans le presse-papiers n’est pas disponible dans ce navigateur.");
    await navigator.clipboard.writeText(buildReportScientificReference(generation).citationText);
    setActionState(params, id, { action, state: "success", message: "Référence bibliographique copiée depuis le snapshot historique." });
  } catch (error) {
    setActionState(params, id, { action, state: "error", message: error instanceof Error ? error.message : "Impossible de copier la référence bibliographique." });
  }
}

async function handleStructuredExport(params: HistoryActionsParams, id: string, action: "json" | "csv"): Promise<void> {
  try {
    await downloadHistoricalReportData({ generationId: id, format: action });
    setActionState(params, id, { action, state: "success", message: `Export ${action.toUpperCase()} téléchargé depuis le snapshot historique. Aucun nouveau calcul métier ni quota de génération n’a été utilisé.` });
  } catch (error) {
    setActionState(params, id, { action, state: "error", message: error instanceof Error ? error.message : "Impossible d’exporter le snapshot historique." });
  }
}

async function handleReplay(params: HistoryActionsParams, id: string, action: ReportGenerationHistoryActionState["action"], ref: HistoricalReplayRef, theme: ReportPdfTheme): Promise<void> {
  const reportWindow = prepareReportWindow();
  if (!reportWindow) {
    setActionState(params, id, { action, state: "error", message: "La fenêtre du rapport a été bloquée. Autorisez les fenêtres puis réessayez." });
    return;
  }
  try {
    const derived = action === "derive" ? await deriveHistoricalReportSnapshot(id) : null;
    const generation = derived?.generation ?? await loadHistoricalReportSnapshot(id);
    ref.current = { reportWindow, payload: generation.snapshot };
    if (derived) {
      const refreshed = await params.refreshHistory();
      if (refreshed) params.setHistoryAvailability("available");
      params.setDailyExportAvailability("used");
      renderReportWindow(reportWindow, generation.snapshot, { theme });
    } else if (action === "view") {
      replayHistoricalReport(action, generation, {
        view: (payload) => renderReportWindow(reportWindow, payload, { theme }),
        reexport: (payload) => renderReportWindow(reportWindow, payload, { theme }),
      });
    }
    setActionState(params, id, { action, state: "success", message: action === "view" ? "Rapport historique ouvert depuis le snapshot enregistré." : "Nouvelle version créée depuis le snapshot source. Le snapshot d'origine reste inchangé et le quota a été consommé." });
  } catch (error) {
    reportWindow.close();
    setActionState(params, id, { action, state: "error", message: error instanceof Error ? error.message : "Impossible de charger le rapport historique." });
  }
}

async function handleHistoricalAction(params: HistoryActionsParams, id: string, action: ReportGenerationHistoryActionState["action"], ref: HistoricalReplayRef, themeOverride?: ReportPdfTheme): Promise<void> {
  const theme = themeOverride ?? params.reportTheme;
  const message = action === "view" ? "Ouverture du rapport historique..." : action === "reexport" ? "Préparation du fichier PDF..." : action === "reference" ? "Préparation de la référence bibliographique..." : action === "json" || action === "csv" ? "Préparation de l’export structuré..." : "Création d'une nouvelle version...";
  setActionState(params, id, { action, state: "pending", message });
  if (action === "reexport") return handleReexport(params, id, action, theme);
  if (action === "reference") return handleReference(params, id, action);
  if (action === "json" || action === "csv") return handleStructuredExport(params, id, action);
  return handleReplay(params, id, action, ref, theme);
}

async function handleHistoricalPrint(params: HistoryActionsParams, id: string, themeOverride?: ReportPdfTheme): Promise<void> {
  const theme = themeOverride ?? params.reportTheme;
  setActionState(params, id, { action: "print", state: "pending", message: "Préparation de l’impression..." });
  const reportWindow = prepareReportWindow();
  if (!reportWindow) {
    setActionState(params, id, { action: "print", state: "error", message: "La fenêtre du rapport a été bloquée. Autorisez les fenêtres puis réessayez." });
    return;
  }
  try {
    const generation = await loadHistoricalReportSnapshot(id);
    renderReportWindow(reportWindow, generation.snapshot, { theme, autoPrint: true });
    setActionState(params, id, { action: "print", state: "success", message: "Fenêtre d’impression ouverte depuis le snapshot enregistré." });
  } catch (error) {
    reportWindow.close();
    setActionState(params, id, { action: "print", state: "error", message: error instanceof Error ? error.message : "Impossible d’imprimer le rapport historique." });
  }
}

export function createReportsWebDocumentHistoryActions(params: HistoryActionsParams) {
  return {
    handleHistoricalAction: (id: string, action: ReportGenerationHistoryActionState["action"], ref: HistoricalReplayRef, theme?: ReportPdfTheme) => handleHistoricalAction(params, id, action, ref, theme),
    handleHistoricalPrint: (id: string, theme?: ReportPdfTheme) => handleHistoricalPrint(params, id, theme),
    handleThemeChange: (theme: ReportPdfTheme, ref: HistoricalReplayRef) => {
      if (ref.current && !ref.current.reportWindow.closed) renderReportWindow(ref.current.reportWindow, ref.current.payload, { theme });
    },
  };
}
