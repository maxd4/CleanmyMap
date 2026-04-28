"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { buildActionsCsv, buildActionsCsvFilename } from "@/lib/reports/csv";
import type { ActionMapItem } from "@/lib/actions/types";
import { toActionsMapCsvRows } from "./actions-map-export.utils";

type ActionsMapExportButtonProps = {
  items: ActionMapItem[];
};

export function ActionsMapExportButton({ items }: ActionsMapExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const filename = useMemo(() => buildActionsCsvFilename(), []);
  const canExport = items.length > 0;

  function handleExport() {
    if (!canExport || isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const csv = buildActionsCsv(toActionsMapCsvRows(items));
      if (!csv.trim()) {
        throw new Error("Aucune ligne exportable");
      }

      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur export CSV carte:", error);
      alert("Impossible de générer l'export CSV de la carte. Réessaie après avoir ajusté les filtres.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!canExport || isExporting}
      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Exporter la vue filtrée de la carte au format CSV"
    >
      <FileSpreadsheet size={16} aria-hidden="true" />
      {isExporting ? "Export..." : "Exporter la vue"}
    </button>
  );
}
