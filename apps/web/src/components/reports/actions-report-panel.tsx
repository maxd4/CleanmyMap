"use client";

import { StepConfirm } from"@/components/reports/admin-workflow/step-confirm";
import { StepFilter } from"@/components/reports/admin-workflow/step-filter";
import { StepJournal } from"@/components/reports/admin-workflow/step-journal";
import { StepPreview } from"@/components/reports/admin-workflow/step-preview";
import { useAdminWorkflow } from"@/components/reports/admin-workflow/use-admin-workflow";

export function ActionsReportPanel() {
 const workflow = useAdminWorkflow();

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
 <h2 className="text-xl font-semibold cmm-text-primary">
 Workflow admin guide: moderation / import / export
 </h2>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Parcours en 4 etapes: filtrer -&gt; previsualiser -&gt; confirmer -&gt;
 journaliser.
 </p>

 <StepFilter workflow={workflow} />
 <StepPreview workflow={workflow} />
 <StepConfirm workflow={workflow} />
 <StepJournal workflow={workflow} />

 <div className="mt-4 space-y-1 cmm-text-caption cmm-text-muted">
 <p>
 CSV: <code>{workflow.csvExportUrl}</code>
 </p>
 <p>
 JSON: <code>{workflow.jsonExportUrl}</code>
 </p>
 </div>

 {workflow.lastSuccessMessage ? (
 <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-small text-emerald-700">
 {workflow.lastSuccessMessage}
 </p>
 ) : null}

 {workflow.errorMessage ? (
 <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
 {workflow.errorMessage}
 </p>
 ) : null}
 </section>
 );
}
