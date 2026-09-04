"use client";

import {
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { SystemStateLayout, SystemStateTitle } from "@/components/ui/system-state";
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
  historyAvailability?: "available" | "unavailable";
  actionStateById?: Record<string, ReportGenerationHistoryActionState>;
  onView: (id: string) => void;
  onReexport: (id: string) => void;
};

export type ReportGenerationHistoryActionState = {
  action: "view" | "reexport";
  state: "pending" | "success" | "error";
  message: string;
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
  const feedbackTone =
    state === "error" ? "error" : state === "success" ? "success" : "info";

  return (
    <GenerationStageCard
      tone="export"
      step="3"
      title="Ce qui est prêt à exporter"
      description="Lancez le PDF dès que la configuration est validée."
      action={
        <CmmButton
          onClick={onGenerate}
          disabled={isDisabled}
          loading={state === "pending"}
          tone="primary"
          size="lg"
        >
          <FileText size={18} />
          {state === "pending" ? pendingLabel : "Générer le rapport"}
        </CmmButton>
      }
    >
      <div className="space-y-3">
        <CmmFeedback tone={feedbackTone} title={exportStatus.label}>
          <span className="inline-flex items-center gap-2">
            <ExportStatusIcon size={18} aria-hidden="true" />
            {exportStatus.description}
          </span>
        </CmmFeedback>

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
          <CmmFeedback tone={state === "error" ? "error" : "info"}>{message}</CmmFeedback>
        ) : null}
        {historyWarning ? (
          <CmmFeedback tone="warning">{historyWarning}</CmmFeedback>
        ) : null}
      </div>
    </GenerationStageCard>
  );
}

export function ReportsWebDocumentDeliveryHistory({
  recentRows,
  historyAvailability = "available",
  actionStateById = {},
  onView,
  onReexport,
}: ReportsWebDocumentDeliveryHistoryProps) {
  return (
    <section id="reports-history" className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-red-600">Rapports récents</p>
          <p className="mt-1 text-sm text-slate-500">Derniers rapports générés.</p>
        </div>
      </div>

      {historyAvailability === "unavailable" ? (
        <CmmFeedback tone="warning" className="mt-4">
          Historique temporairement indisponible
        </CmmFeedback>
      ) : recentRows.length === 0 ? (
        <SystemStateLayout variant="empty" className="mt-4">
          <SystemStateTitle variant="empty">Aucun rapport généré</SystemStateTitle>
        </SystemStateLayout>
      ) : (
        <div className="cmm-data-table-wrap mt-4">
          <table className="cmm-data-table">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                {["Rapport", "Période", "Périmètre", "Détail", "Généré le", "Actions"].map((header) => (
                  <th key={header} scope="col" className="font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                        <FileText size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{row.report}</p>
                    </div>
                  </td>
                  <td className="text-sm text-slate-600">
                    {row.period}
                  </td>
                  <td className="text-sm text-slate-600">
                    {row.perimeter}
                  </td>
                  <td className="text-sm text-slate-600">
                    {row.detail}
                  </td>
                  <td className="text-sm text-slate-600">
                    {row.generatedAt}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <CmmButton
                        disabled={actionStateById[row.id]?.state === "pending"}
                        onClick={() => onView(row.id)}
                        tone="tertiary"
                        variant="ghost"
                        size="sm"
                      >
                        Voir
                      </CmmButton>
                      <CmmButton
                        disabled={actionStateById[row.id]?.state === "pending"}
                        onClick={() => onReexport(row.id)}
                        tone="tertiary"
                        variant="ghost"
                        size="sm"
                      >
                        Réexporter
                      </CmmButton>
                    </div>
                    {actionStateById[row.id] ? (
                      <CmmFeedback
                        tone={
                          actionStateById[row.id].state === "error"
                            ? "error"
                            : actionStateById[row.id].state === "pending"
                              ? "info"
                              : "success"
                        }
                        className="mt-2"
                      >
                        {actionStateById[row.id].message}
                      </CmmFeedback>
                    ) : null}
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
