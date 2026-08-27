"use client";

import { StepConfirm } from "@/components/reports/admin-workflow/step-confirm";
import { StepFilter } from "@/components/reports/admin-workflow/step-filter";
import { StepJournal } from "@/components/reports/admin-workflow/step-journal";
import { StepPreview } from "@/components/reports/admin-workflow/step-preview";
import { useAdminWorkflow } from "@/components/reports/admin-workflow/use-admin-workflow";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import type { ActionListResponse } from "@/lib/actions/types";
import type { ActionStatus } from "@/lib/actions/types";
import type { AdminOperationAuditItem } from "@/components/reports/admin-workflow/types";
import type { AdminRecordTypeFilter } from "@/components/reports/admin-workflow/types";

/**
 * Standardized Admin Workflow Panel.
 * Uses AdminPanelShell for UI consistency and software sobriety.
 */
type ActionsReportPanelProps = {
  initialPreview?: ActionListResponse | null;
  initialAuditItems?: AdminOperationAuditItem[] | null;
  initialRecordTypeFilter?: AdminRecordTypeFilter;
  initialStatus?: ActionStatus | "all";
};

export function ActionsReportPanel({
  initialPreview,
  initialAuditItems,
  initialRecordTypeFilter,
  initialStatus,
}: ActionsReportPanelProps) {
  const workflow = useAdminWorkflow({
    initialPreview,
    initialAuditItems,
    initialRecordTypeFilter,
    initialStatus,
  });

  return (
    <AdminPanelShell
      title="Workflow administration"
      subtitle="Parcours guidé : filtrage, prévisualisation, confirmation et journalisation."
      variant="warm"
    >
      <div className="space-y-8">
        <div className="grid gap-6">
          <StepFilter workflow={workflow} />
          <StepPreview workflow={workflow} />
          <StepConfirm workflow={workflow} />
          <StepJournal workflow={workflow} />
        </div>

        <div className="mt-8 space-y-2 border-t border-stone-200 pt-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            Exports directs
          </p>
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-stone-700">
            <code className="rounded bg-stone-100 px-2 py-1">CSV: {workflow.csvExportUrl}</code>
            <code className="rounded bg-stone-100 px-2 py-1">JSON: {workflow.jsonExportUrl}</code>
          </div>
        </div>

        {workflow.lastSuccessMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-800">
              {workflow.lastSuccessMessage}
            </p>
          </div>
        )}

        {workflow.errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-medium text-red-800">
              {workflow.errorMessage}
            </p>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
