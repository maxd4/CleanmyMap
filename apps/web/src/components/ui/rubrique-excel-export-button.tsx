"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { buildDeliverableBaseName, normalizeDeliverableRubrique } from "@/lib/reports/deliverable-name";
import { buildExportUiCopy } from "@/lib/reports/export-ui";
import { escapeCsvCell } from "@/lib/reports/csv";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import { buildTabularCsv } from "@/lib/reports/tabular-csv";

type RubriqueExcelExportButtonProps = {
  rubriqueTitle: string;
  data?: Record<string, unknown>[]; // Raw data to export
  columns?: { key: string; label: string }[];
  targetTableSelector?: string; // Fallback: parse a DOM table
  serverEndpoint?: string;
  initialDailyExportAvailability?: ReportExportAvailability;
};

function tableToCsv(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      return cells.map((cell) => escapeCsvCell(cell.textContent ?? "", ";")).join(";");
    })
    .join("\n");
}

export function RubriqueExcelExportButton({
 rubriqueTitle,
 data,
  columns,
  targetTableSelector,
  serverEndpoint,
  initialDailyExportAvailability = "available",
}: RubriqueExcelExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [dailyExportAvailability, setDailyExportAvailability] = useState<ReportExportAvailability>(
    initialDailyExportAvailability,
  );
  const copy = useMemo(() => buildExportUiCopy({ format: "csv", subject: "Tableau" }), []);

  const filename = useMemo(
    () =>
      `${buildDeliverableBaseName({ rubrique: normalizeDeliverableRubrique(rubriqueTitle) })}.csv`,
    [rubriqueTitle],
  );

  const handleExport = async () => {
    if (serverEndpoint && dailyExportAvailability !== "available") {
      return;
    }
    setIsExporting(true);
    try {
      if (serverEndpoint) {
        const response = await fetch(serverEndpoint, { method: "GET" });
        if (!response.ok) {
          if (response.status === 429) {
            setDailyExportAvailability("used");
          }
          const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
          throw new Error(typeof body?.error === "string" ? body.error : "Export indisponible");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = response.headers.get("X-Deliverable-Name") ?? filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        setDailyExportAvailability("used");
        return;
      }

      let csv = "";

      if (data && data.length > 0) {
        csv = buildTabularCsv(data, columns);
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
      console.error("Erreur export CSV:", error);
      alert(copy.errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting || (Boolean(serverEndpoint) && dailyExportAvailability !== "available")}
        title={filename}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 cmm-text-small font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
        aria-label={`Exporter les donnees de ${rubriqueTitle} au format CSV`}
      >
        <FileSpreadsheet size={16} aria-hidden="true" />
        {isExporting ? copy.pendingLabel : copy.triggerLabel}
      </button>
      {serverEndpoint ? (
        <p className="mt-2 text-xs leading-5 text-slate-500" role="status">
          1 export détaillé par jour (Europe/Paris). {dailyExportAvailability === "available"
            ? "Votre export est disponible aujourd'hui."
            : dailyExportAvailability === "used"
              ? "Export déjà utilisé aujourd'hui ; le prochain sera disponible le jour civil suivant."
              : "Disponibilité temporairement indisponible ; réessayez plus tard."}
        </p>
      ) : null}
    </>
  );
}
