import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  renderReportWindow,
  prepareReportWindow,
} from "@/lib/pdf-export/browser-report";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";
import {
  downloadHistoricalReportData,
  downloadOrShareReportPdf,
} from "@/components/reports/report-pdf-actions";
import type { ReportGenerationHistoryActionState } from "./web-document/reports-web-document-delivery";
import {
  deriveHistoricalReportSnapshot,
  loadHistoricalReportSnapshot,
} from "@/lib/reports/historical-report-client";
import { buildReportScientificReference } from "@/lib/reports/report-scientific-export";
import { replayHistoricalReport } from "@/lib/reports/historical-report-replay";
import {
  REPORT_GENERATION_HISTORY_LIMIT,
  type ReportGenerationHistoryRow,
} from "@/lib/reports/report-generation-history-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportPdfTheme } from "./web-document/reports-web-document.shared";

type HistoricalReplay = { reportWindow: Window; payload: PdfReportPayload };

type HistoryActionsParams = {
  reportTheme: ReportPdfTheme;
  setRecentRows: Dispatch<SetStateAction<ReportGenerationHistoryRow[]>>;
  setHistoryAvailability: Dispatch<SetStateAction<"available" | "unavailable">>;
  setDailyExportAvailability: Dispatch<SetStateAction<ReportExportAvailability>>;
  setHistoryActionStateById: Dispatch<SetStateAction<Record<string, ReportGenerationHistoryActionState>>>;
};

type HistoricalReplayRef = MutableRefObject<HistoricalReplay | null>;

export function createReportsWebDocumentHistoryActions(params: HistoryActionsParams) {
  async function handleHistoricalAction(
    id: string,
    action: ReportGenerationHistoryActionState["action"],
    historicalReplayRef: HistoricalReplayRef,
    themeOverride?: ReportPdfTheme,
  ): Promise<void> {
    const theme = themeOverride ?? params.reportTheme;
    params.setHistoryActionStateById((current) => ({
      ...current,
      [id]: {
        action,
        state: "pending",
        message: action === "view"
          ? "Ouverture du rapport historique..."
          : action === "reexport"
            ? "Préparation du fichier PDF..."
            : action === "reference"
              ? "Préparation de la référence bibliographique..."
              : action === "json" || action === "csv"
                ? "Préparation de l’export structuré..."
            : "Création d'une nouvelle version...",
      },
    }));

    if (action === "reexport") {
      try {
        const result = await downloadOrShareReportPdf({ generationId: id, theme });
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: {
            action,
            state: "success",
            message: result === "shared"
              ? "Le fichier PDF a été transmis au partage natif. Aucun nouveau quota n’a été consommé."
              : "Le fichier PDF a été téléchargé depuis le snapshot enregistré. Aucun nouveau quota n’a été consommé.",
          },
        }));
      } catch (error) {
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: {
            action,
            state: "error",
            message: error instanceof Error ? error.message : "Impossible de télécharger le PDF historique.",
          },
        }));
      }
      return;
    }

    if (action === "reference") {
      try {
        const generation = await loadHistoricalReportSnapshot(id);
        if (!navigator.clipboard?.writeText) {
          throw new Error("La copie dans le presse-papiers n’est pas disponible dans ce navigateur.");
        }
        await navigator.clipboard.writeText(buildReportScientificReference(generation).citationText);
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: { action, state: "success", message: "Référence bibliographique copiée depuis le snapshot historique." },
        }));
      } catch (error) {
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: { action, state: "error", message: error instanceof Error ? error.message : "Impossible de copier la référence bibliographique." },
        }));
      }
      return;
    }

    if (action === "json" || action === "csv") {
      try {
        await downloadHistoricalReportData({ generationId: id, format: action });
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: {
            action,
            state: "success",
            message: `Export ${action.toUpperCase()} téléchargé depuis le snapshot historique. Aucun nouveau calcul métier ni quota de génération n’a été utilisé.`,
          },
        }));
      } catch (error) {
        params.setHistoryActionStateById((current) => ({
          ...current,
          [id]: { action, state: "error", message: error instanceof Error ? error.message : "Impossible d’exporter le snapshot historique." },
        }));
      }
      return;
    }

    const reportWindow = prepareReportWindow();
    if (!reportWindow) {
      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "error",
          message: "La fenêtre du rapport a été bloquée. Autorisez les fenêtres puis réessayez.",
        },
      }));
      return;
    }

    try {
      const derived = action === "derive" ? await deriveHistoricalReportSnapshot(id) : null;
      const generation = derived?.generation ?? await loadHistoricalReportSnapshot(id);
      historicalReplayRef.current = { reportWindow, payload: generation.snapshot };
      if (derived) {
        params.setRecentRows((current) => [derived.item, ...current].slice(0, REPORT_GENERATION_HISTORY_LIMIT));
        params.setHistoryAvailability("available");
        params.setDailyExportAvailability("used");
        renderReportWindow(reportWindow, generation.snapshot, { theme });
      } else if (action === "view") {
        replayHistoricalReport(action, generation, {
          view: (payload) => renderReportWindow(reportWindow, payload, { theme }),
          reexport: (payload) => renderReportWindow(reportWindow, payload, { theme }),
        });
      }

      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "success",
          message: action === "view"
            ? "Rapport historique ouvert depuis le snapshot enregistré."
            : "Nouvelle version créée depuis le snapshot source. Le snapshot d'origine reste inchangé et le quota a été consommé.",
        },
      }));
    } catch (error) {
      reportWindow.close();
      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: {
          action,
          state: "error",
          message: error instanceof Error ? error.message : "Impossible de charger le rapport historique.",
        },
      }));
    }
  }

  async function handleHistoricalPrint(id: string, themeOverride?: ReportPdfTheme): Promise<void> {
    const theme = themeOverride ?? params.reportTheme;
    params.setHistoryActionStateById((current) => ({
      ...current,
      [id]: { action: "print", state: "pending", message: "Préparation de l’impression..." },
    }));
    const reportWindow = prepareReportWindow();
    if (!reportWindow) {
      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: { action: "print", state: "error", message: "La fenêtre du rapport a été bloquée. Autorisez les fenêtres puis réessayez." },
      }));
      return;
    }
    try {
      const generation = await loadHistoricalReportSnapshot(id);
      renderReportWindow(reportWindow, generation.snapshot, { theme });
      window.setTimeout(() => reportWindow.print(), 250);
      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: { action: "print", state: "success", message: "Fenêtre d’impression ouverte depuis le snapshot enregistré." },
      }));
    } catch (error) {
      reportWindow.close();
      params.setHistoryActionStateById((current) => ({
        ...current,
        [id]: { action: "print", state: "error", message: error instanceof Error ? error.message : "Impossible d’imprimer le rapport historique." },
      }));
    }
  }

  function handleThemeChange(theme: ReportPdfTheme, historicalReplayRef: HistoricalReplayRef): void {
    if (historicalReplayRef.current && !historicalReplayRef.current.reportWindow.closed) {
      renderReportWindow(historicalReplayRef.current.reportWindow, historicalReplayRef.current.payload, { theme });
    }
  }

  return { handleHistoricalAction, handleHistoricalPrint, handleThemeChange };
}
