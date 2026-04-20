"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  buildDeliverableBaseName, 
  normalizeDeliverableRubrique 
} from "@/lib/reports/deliverable-name";
import { Table, FileSpreadsheet } from "lucide-react";

type RubriqueExcelExportButtonProps = {
  rubriqueTitle: string;
  data?: any[]; // Raw data to export
  columns?: { key: string; label: string }[];
  targetTableSelector?: string; // Fallback: parse a DOM table
};

export function RubriqueExcelExportButton({
  rubriqueTitle,
  data,
  columns,
  targetTableSelector,
}: RubriqueExcelExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const filename = useMemo(
    () => `${buildDeliverableBaseName({ rubrique: normalizeDeliverableRubrique(rubriqueTitle) })}.xlsx`,
    [rubriqueTitle]
  );

  const handleExport = () => {
    setIsExporting(true);
    try {
      let worksheet: XLSX.WorkSheet;

      if (data && data.length > 0) {
        // Map data to labels if columns are provided
        const exportData = columns 
          ? data.map(item => {
              const row: any = {};
              columns.forEach(col => {
                row[col.label] = item[col.key];
              });
              return row;
            })
          : data;
        
        worksheet = XLSX.utils.json_to_sheet(exportData);
      } else if (targetTableSelector) {
        const table = document.querySelector(targetTableSelector);
        if (table) {
          worksheet = XLSX.utils.table_to_sheet(table);
        } else {
          throw new Error("Table non trouvée");
        }
      } else {
        throw new Error("Aucune donnée à exporter");
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      alert("Erreur lors de l'export Excel. Vérifiez les données.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
    >
      <FileSpreadsheet size={16} />
      {isExporting ? "Export en cours..." : "Exporter Excel (.xlsx)"}
    </button>
  );
}
