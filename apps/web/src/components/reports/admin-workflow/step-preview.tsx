import type { ActionQualityGrade } from "@/lib/actions/quality";
import type { AdminWorkflowController } from "./types";

type StepPreviewProps = {
  workflow: AdminWorkflowController;
};

function qualityTone(grade: ActionQualityGrade): string {
  if (grade === "A") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (grade === "B") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function StepPreview({ workflow }: StepPreviewProps) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Etape 2 - Previsualiser
        </p>
        <button
          onClick={workflow.reloadPreview}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Rafraichir preview
        </button>
      </div>
      {workflow.previewLoading ? (
        <p className="mt-2 text-sm text-slate-500">Chargement de la preview...</p>
      ) : null}
      {workflow.previewError ? (
        <p className="mt-2 text-sm text-rose-700">Preview indisponible.</p>
      ) : null}
      {!workflow.previewLoading && !workflow.previewError ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Lieu</th>
                <th className="px-2 py-2">Statut</th>
                <th className="px-2 py-2">Qualite</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {workflow.previewRows.map((row) => (
                <tr
                  key={row.item.id}
                  className="border-t border-slate-100 text-slate-700"
                >
                  <td className="px-2 py-2 font-mono">{row.item.id.slice(0, 8)}...</td>
                  <td className="px-2 py-2">{row.item.action_date}</td>
                  <td className="px-2 py-2">{row.item.location_label}</td>
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
                      onClick={() => workflow.selectActionForModeration(row.item.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100"
                    >
                      Moderer
                    </button>
                  </td>
                </tr>
              ))}
              {workflow.previewRows.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td className="px-2 py-3 text-slate-500" colSpan={6}>
                    Aucun element correspondant au filtre.
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
