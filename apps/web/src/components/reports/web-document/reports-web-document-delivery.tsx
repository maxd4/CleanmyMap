"use client";

import {
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReportGenerationHistoryRow } from "@/lib/reports/report-generation-history-contract";
import { GenerationStageCard } from "./reports-web-document.shared";

export type ReportsWebDocumentExportStatus = {
  icon: LucideIcon;
  label: string;
  description: string;
  tone: string;
  iconTone: string;
};

export type { ReportGenerationHistoryRow as ReportsWebDocumentHistoryRow };

export type ReportsWebDocumentDeliveryProps = {
  state: "idle" | "pending" | "success" | "error";
  message: string | null;
  pendingLabel: string;
  isDisabled: boolean;
  exportStatus: ReportsWebDocumentExportStatus;
  historyWarning: string | null;
  onGenerate: () => void;
};

export type ReportsWebDocumentDeliveryHistoryProps = {
  recentRows: ReportGenerationHistoryRow[];
};

export function ReportsWebDocumentDelivery({
  state,
  message,
  pendingLabel,
  isDisabled,
  exportStatus,
  historyWarning,
  onGenerate,
}: ReportsWebDocumentDeliveryProps) {
  const ExportStatusIcon = exportStatus.icon;

  return (
    <GenerationStageCard
      tone="export"
      step="3"
      title="Ce qui est prêt à exporter"
      description="Lancez le PDF dès que la configuration est validée."
      action={
        <button
          type="button"
          onClick={onGenerate}
          disabled={isDisabled}
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 text-sm font-black text-white shadow-[0_18px_34px_-18px_rgba(220,38,38,0.55)] transition hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={18} />
          {state === "pending" ? pendingLabel : "Générer le rapport"}
        </button>
      }
    >
      <div className="space-y-3">
        <div className={`flex items-start gap-3 rounded-2xl border px-3 py-3 ${exportStatus.tone}`}>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${exportStatus.iconTone}`}
          >
            <ExportStatusIcon size={18} className={state === "pending" ? "animate-spin" : ""} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">{exportStatus.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              {exportStatus.description}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Ce qui est prêt à exporter
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              Le PDF officiel reprend la configuration et les modules sélectionnés.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              Les contenus verrouillés restent réduits lorsque le niveau choisi ne suffit pas.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              L&apos;export s&apos;ouvre une fois la préparation terminée et valide.
            </li>
          </ul>
        </div>

        <p className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-red-600" />
          Le rapport est généré à partir des données et de la méthodologie CleanMyMap.
        </p>

        {message ? (
          <p
            role={state === "error" ? "alert" : "status"}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              state === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-cyan-200 bg-cyan-50 text-cyan-900"
            }`}
          >
            {message}
          </p>
        ) : null}
        {historyWarning ? (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
          >
            {historyWarning}
          </p>
        ) : null}
      </div>
    </GenerationStageCard>
  );
}

export function ReportsWebDocumentDeliveryHistory({
  recentRows,
}: ReportsWebDocumentDeliveryHistoryProps) {
  return (
    <section id="reports-history" className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-red-600">Rapports récents</p>
          <p className="mt-1 text-sm text-slate-500">Derniers rapports générés.</p>
        </div>
      </div>

      {recentRows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
          Aucun rapport généré
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-full border-separate border-spacing-0 text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                {["Rapport", "Période", "Périmètre", "Détail", "Généré le"].map((header) => (
                  <th key={header} className="border-b border-slate-200 px-4 py-3 font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{row.report}</p>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.period}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.perimeter}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.detail}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                    {row.generatedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
