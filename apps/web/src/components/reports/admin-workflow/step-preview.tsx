"use client";

import type { ActionQualityGrade } from"@/lib/actions/quality";
import type { AdminWorkflowController } from"./types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepPreviewProps = {
  workflow: AdminWorkflowController;
};

function qualityTone(grade: ActionQualityGrade): string {
  if (grade ==="A") return"border-emerald-200 bg-emerald-50 text-emerald-700";
  if (grade ==="B") return"border-amber-200 bg-amber-50 text-amber-700";
  return"border-red-200 bg-red-50 text-red-700";
}

export function StepPreview({ workflow }: StepPreviewProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3">
    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
    {fr ? "Étape 2 - Prévisualiser" : "Step 2 - Preview"}
    </p>
    <button
      onClick={workflow.reloadPreview}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
    >
    {fr ? "Actualiser" : "Refresh"}
    </button>
    </div>
    {workflow.previewLoading ? (
    <p className="mt-2 cmm-text-small cmm-text-muted">{fr ? "Chargement de l'aperçu..." : "Loading preview..."}</p>
    ) : null}
    {workflow.previewError ? (
    <p className="mt-2 cmm-text-small text-red-700">{fr ? "Aperçu indisponible." : "Preview unavailable."}</p>
    ) : null}
    {!workflow.previewLoading && !workflow.previewError ? (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
    <table className="min-w-full text-left cmm-text-caption">
    <thead className="bg-slate-50 cmm-text-secondary">
    <tr>
    <th className="px-2 py-2">{fr ? "ID" : "ID"}</th>
    <th className="px-2 py-2">{fr ? "Date" : "Date"}</th>
    <th className="px-2 py-2">{fr ? "Lieu" : "Location"}</th>
    <th className="px-2 py-2">{fr ? "Compte" : "Account"}</th>
    <th className="px-2 py-2">{fr ? "Statut" : "Status"}</th>
    <th className="px-2 py-2">{fr ? "Qualité" : "Quality"}</th>
    <th className="px-2 py-2">{fr ? "Action" : "Action"}</th>
    </tr>
    </thead>
 <tbody>
 {workflow.previewRows.map((row) => (
 <tr
 key={row.item.id}
 className="border-t border-slate-100 cmm-text-secondary"
 >
 <td className="px-2 py-2 font-mono">{row.item.id.slice(0, 8)}...</td>
 <td className="px-2 py-2">{row.item.action_date}</td>
 <td className="px-2 py-2">{row.item.location_label}</td>
 <td className="px-2 py-2 font-mono text-[11px]">
 {row.item.created_by_clerk_id?.trim() || "anonymous"}
 </td>
 <td className="px-2 py-2">{row.item.status}</td>
 <td className="px-2 py-2">
 <span
 className={`rounded-full border px-2 py-0.5 ${qualityTone(row.quality.grade)}`}
 >
 {row.quality.grade} ({row.quality.score})
 </span>
 </td>
 <td className="px-2 py-2">
 <button
 onClick={() => workflow.selectActionForModeration(row.item)}
 className="rounded border border-slate-300 px-2 py-0.5 cmm-text-caption hover:bg-slate-100"
 >
 Moderer
 </button>
 </td>
 </tr>
 ))}
{workflow.previewRows.length === 0 ? (
 <tr className="border-t border-slate-100">
 <td className="px-2 py-3 cmm-text-muted" colSpan={7}>
  Aucun élément ne correspond au filtre de modération.
 </td>
 </tr>
) : null}
 </tbody>
 </table>
 </div>
 ) : null}
 </div>
 );
}
