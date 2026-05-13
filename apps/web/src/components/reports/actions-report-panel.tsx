"use client";

import { StepConfirm } from "@/components/reports/admin-workflow/step-confirm";
import { StepFilter } from "@/components/reports/admin-workflow/step-filter";
import { StepJournal } from "@/components/reports/admin-workflow/step-journal";
import { StepPreview } from "@/components/reports/admin-workflow/step-preview";
import { useAdminWorkflow } from "@/components/reports/admin-workflow/use-admin-workflow";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";

/**
 * Standardized Admin Workflow Panel.
 * Uses AdminPanelShell for UI consistency and software sobriety.
 */
export function ActionsReportPanel() {
  const workflow = useAdminWorkflow();

  return (
    <AdminPanelShell
      title="Workflow Administration"
      subtitle="Parcours guidé : filtrage, prévisualisation, confirmation et journalisation."
    >
      <div className="space-y-8">
        <div className="grid gap-6">
          <StepFilter workflow={workflow} />
          <StepPreview workflow={workflow} />
          <StepConfirm workflow={workflow} />
          <StepJournal workflow={workflow} />
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Exports directs
          </p>
          <div className="flex gap-4 text-[10px] font-mono text-emerald-400/60">
            <code className="bg-emerald-500/5 px-2 py-1 rounded">CSV: {workflow.csvExportUrl}</code>
            <code className="bg-emerald-500/5 px-2 py-1 rounded">JSON: {workflow.jsonExportUrl}</code>
          </div>
        </div>

        {workflow.lastSuccessMessage && (
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <p className="text-xs font-medium text-emerald-400">
              {workflow.lastSuccessMessage}
            </p>
          </div>
        )}

        {workflow.errorMessage && (
          <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-4">
            <p className="text-xs font-medium text-rose-400">
              {workflow.errorMessage}
            </p>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
