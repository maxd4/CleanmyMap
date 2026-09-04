"use client";

import type { ActionQualityGrade } from"@/lib/actions/quality/quality";
import type { AdminWorkflowController } from"./types";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepPreviewProps = {
  workflow: AdminWorkflowController;
};

export function formatPreviewRecordType(
  item: AdminWorkflowController["previewRows"][number]["item"],
): string {
  const type = item.contract?.type ?? item.record_type;
  if (type === "spot") {
    return "Spot";
  }
  if (type === "clean_place") {
    return "Lieu propre";
  }
  if (type === "action") {
    return "Action";
  }
  return item.source === "trash_spotter_spots" ? "Signalement" : "Action";
}

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
    <div className="cmm-data-table-wrap mt-3">
    <table className="cmm-data-table" data-density="compact">
    <thead className="bg-slate-50 cmm-text-secondary">
    <tr>
    <th scope="col">{fr ? "ID" : "ID"}</th>
    <th scope="col">{fr ? "Date" : "Date"}</th>
    <th scope="col">{fr ? "Lieu" : "Location"}</th>
    <th scope="col">{fr ? "Compte" : "Account"}</th>
    <th scope="col">{fr ? "Type de record" : "Record type"}</th>
    <th scope="col">{fr ? "Statut" : "Status"}</th>
    <th scope="col">{fr ? "Qualité" : "Quality"}</th>
    <th scope="col">{fr ? "Action" : "Action"}</th>
    </tr>
    </thead>
 <tbody>
 {workflow.previewRows.map((row) => (
 <tr
 key={row.item.id}
 className="border-t border-slate-100 cmm-text-secondary"
 >
 <td className="font-mono">{row.item.id.slice(0, 8)}...</td>
 <td>{row.item.action_date}</td>
 <td>{row.item.location_label}</td>
 <td className="font-mono text-[11px]">
 {row.item.created_by_clerk_id?.trim() || "anonymous"}
 </td>
 <td className="font-semibold">{formatPreviewRecordType(row.item)}</td>
 <td>{row.item.status}</td>
 <td>
 <span
 className={`rounded-full border px-2 py-0.5 ${qualityTone(row.quality.grade)}`}
 >
 {row.quality.grade} ({row.quality.score})
 </span>
 </td>
 <td>
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
 <td className="cmm-text-muted" colSpan={8}>
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
