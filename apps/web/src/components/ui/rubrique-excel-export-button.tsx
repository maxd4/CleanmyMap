"use client";

import { useState, useMemo } from"react";
import { 
 buildDeliverableBaseName, 
 normalizeDeliverableRubrique 
} from"@/lib/reports/deliverable-name";
import { FileSpreadsheet } from"lucide-react";

type RubriqueExcelExportButtonProps = {
 rubriqueTitle: string;
 data?: Record<string, unknown>[]; // Raw data to export
 columns?: { key: string; label: string }[];
 targetTableSelector?: string; // Fallback: parse a DOM table
};

function escapeCsvCell(value: unknown): string {
 const raw = value == null ?"" : String(value);
 const escaped = raw.replace(/"/g,"\"\"");
 return /[",\n;]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsvRows(
 data: Record<string, unknown>[],
 columns?: { key: string; label: string }[],
): string {
 if (!data.length) {
 return"";
 }

 if (columns && columns.length > 0) {
 const header = columns.map((col) => escapeCsvCell(col.label)).join(";");
 const rows = data.map((item) =>
 columns.map((col) => escapeCsvCell(item[col.key])).join(";"),
 );
 return [header, ...rows].join("\n");
 }

 const keys = Object.keys(data[0] ?? {});
 const header = keys.map((key) => escapeCsvCell(key)).join(";");
 const rows = data.map((item) =>
 keys.map((key) => escapeCsvCell(item[key])).join(";"),
 );
 return [header, ...rows].join("\n");
}

function tableToCsv(table: Element): string {
 const rows = Array.from(table.querySelectorAll("tr"));
 return rows
 .map((row) => {
 const cells = Array.from(row.querySelectorAll("th, td"));
 return cells.map((cell) => escapeCsvCell(cell.textContent ??"")).join(";");
 })
 .join("\n");
}

export function RubriqueExcelExportButton({
 rubriqueTitle,
 data,
 columns,
 targetTableSelector,
}: RubriqueExcelExportButtonProps) {
 const [isExporting, setIsExporting] = useState(false);

 const filename = useMemo(
 () => `${buildDeliverableBaseName({ rubrique: normalizeDeliverableRubrique(rubriqueTitle) })}.csv`,
 [rubriqueTitle]
 );

 const handleExport = () => {
 setIsExporting(true);
 try {
 let csv ="";

 if (data && data.length > 0) {
 csv = toCsvRows(data, columns);
 } else if (targetTableSelector) {
 const table = document.querySelector(targetTableSelector);
 if (table) {
 csv = tableToCsv(table);
 } else {
 throw new Error("Table non trouvée");
 }
 } else {
 throw new Error("Aucune donnée à exporter");
 }

 if (!csv.trim()) {
 throw new Error("Aucune ligne exportable");
 }

 const blob = new Blob(["\uFEFF", csv], { type:"text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = filename;
 document.body.appendChild(anchor);
 anchor.click();
 document.body.removeChild(anchor);
 URL.revokeObjectURL(url);
 } catch (error) {
 console.error("Erreur export CSV:", error);
      alert("Impossible de générer l'export CSV. Vérifiez que la page contient des données et réessayez.");
 } finally {
 setIsExporting(false);
 }
 };

 return (
 <button
 onClick={handleExport}
 disabled={isExporting}
 className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 cmm-text-small font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
 aria-label={`Exporter les données de ${rubriqueTitle} au format CSV`}
 >
 <FileSpreadsheet size={16} aria-hidden="true" />
 {isExporting ?"Export en cours..." :"Exporter CSV (Excel)"}
 </button>
 );
}
