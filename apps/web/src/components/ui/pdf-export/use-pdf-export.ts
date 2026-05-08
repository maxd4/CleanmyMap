import { useState, useMemo, useEffect } from "react";
import { normalizeDeliverableRubrique, buildDeliverableBaseName } from "@/lib/reports/deliverable-name";
import { generatePdfHtml } from "@/lib/pdf-export/generate-pdf-html";
import type { ReportModel } from "@/components/reports/web-document/types";

export type ExportHistoryEntry = {
  id: string;
  rubrique: string;
  filename: string;
  generatedAt: string;
};

const STORAGE_KEY = "cleanmymap.rubrique_export_history.v1";
const MAX_HISTORY = 12;

function readHistoryFromStorage(): ExportHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExportHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object")
      .filter((item) => typeof item.id === "string" && typeof item.rubrique === "string" && typeof item.filename === "string" && typeof item.generatedAt === "string")
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function writeHistoryToStorage(entries: ExportHistoryEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

export function usePdfExport(rubriqueTitle: string, targetSelector: string) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [customRubrique, setCustomRubrique] = useState<string>("");
  const [orgType, setOrgType] = useState<"global" | "association" | "entreprise">("global");
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [history, setHistory] = useState<ExportHistoryEntry[]>(() => readHistoryFromStorage());

  const rubriqueSlug = useMemo(
    () => normalizeDeliverableRubrique(customRubrique.trim() || rubriqueTitle),
    [customRubrique, rubriqueTitle],
  );
  const filename = useMemo(
    () => `${buildDeliverableBaseName({ rubrique: rubriqueSlug })}.pdf`,
    [rubriqueSlug],
  );

  useEffect(() => {
    writeHistoryToStorage(history);
  }, [history]);

  function exportRubriquePdf() {
    setState("pending");
    setMessage(null);

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setState("error");
      setMessage("Autorise les popups pour generer le PDF.");
      return;
    }

    const root = document.querySelector<HTMLElement>(targetSelector);
    if (!root) {
      printWindow.close();
      setState("error");
      setMessage("Contenu de rubrique introuvable.");
      return;
    }

    const reportData = (window as any).__REPORT_DATA__ as ReportModel;
    const organizationName = selectedOrg || "Entité non spécifiée";
    const deliverableId = `CMM-RP-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${new Date().getFullYear()}`;

    try {
      const html = generatePdfHtml(reportData, organizationName, selectedOrg, deliverableId);

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      const newEntry: ExportHistoryEntry = {
        id: deliverableId,
        rubrique: rubriqueSlug,
        filename,
        generatedAt: new Date().toISOString(),
      };
      setHistory(prev => [newEntry, ...prev]);

      setState("idle");
    } catch (err) {
      printWindow.close();
      setState("error");
      setMessage("Erreur lors de la génération du PDF.");
    }
  }

  return {
    state,
    message,
    customRubrique,
    setCustomRubrique,
    orgType,
    setOrgType,
    selectedOrg,
    setSelectedOrg,
    history,
    rubriqueSlug,
    filename,
    exportRubriquePdf
  };
}
