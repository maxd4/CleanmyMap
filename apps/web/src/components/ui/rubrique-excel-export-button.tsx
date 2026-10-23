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

async function downloadServerExport(params: {
  endpoint: string;
  filename: string;
  setDailyExportAvailability: (availability: ReportExportAvailability) => void;
}): Promise<void> {
  const response = await fetch(params.endpoint, { method: "GET" });
  if (!response.ok) {
    if (response.status === 429) {
      params.setDailyExportAvailability("used");
    }
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : "Export indisponible");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = response.headers.get("X-Deliverable-Name") ?? params.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  params.setDailyExportAvailability("used");
}

function buildClientExportCsv(params: {
  data?: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
  targetTableSelector?: string;
}): string {
  if (params.data && params.data.length > 0) {
    return buildTabularCsv(params.data, params.columns);
  }
  if (!params.targetTableSelector) {
    throw new Error("Aucune donnée à exporter");
  }

  const table = document.querySelector(params.targetTableSelector);
  if (!table) throw new Error("Table non trouvée");
  return tableToCsv(table);
}

function downloadClientCsv(csv: string, filename: string): void {
  if (!csv.trim()) throw new Error("Aucune ligne exportable");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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
        await downloadServerExport({ endpoint: serverEndpoint, filename, setDailyExportAvailability });
        return;
      }

      const csv = buildClientExportCsv({ data, columns, targetTableSelector });
      downloadClientCsv(csv, filename);
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
        onClick={() => { void /* fire-and-forget -- the export button owns export state and errors. */ handleExport(); }}
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
