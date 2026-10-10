import { buildActionDeclarationExportLabel } from "@/lib/actions/exports/export-form-media";
import type { FormState } from "../model";
import {
  getSelectedTargetLabel,
} from "./action-declaration-export-picker.model";
import type { ActionDeclarationExportTarget } from "@/lib/actions/exports/export-form-media";

type ActionDeclarationExportPickerPreviewProps = {
  form: FormState;
  selectedTarget: ActionDeclarationExportTarget | undefined;
  previewSrc: string;
};

export function ActionDeclarationExportPickerPreview({
  form,
  selectedTarget,
  previewSrc,
}: ActionDeclarationExportPickerPreviewProps) {
  return (
    <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Prévisualisation
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            {selectedTarget?.label ?? "Format sélectionné"}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {selectedTarget?.description}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          {selectedTarget ? getSelectedTargetLabel(selectedTarget) : "Aucun"}
        </span>
      </div>

      <div className="p-4">
        {selectedTarget?.id === "pdf" ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  A4 imprimable
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {buildActionDeclarationExportLabel(form)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                  Date
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-950">{form.actionDate}</p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <dt className="font-semibold text-slate-500">Organisation</dt>
                <dd className="font-bold text-slate-900">{form.associationName || "Non renseignée"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <dt className="font-semibold text-slate-500">Lieu</dt>
                <dd className="font-bold text-slate-900">
                  {form.locationLabel || form.departureLocationLabel || "Non renseigné"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <dt className="font-semibold text-slate-500">Volume</dt>
                <dd className="font-bold text-slate-900">{form.wasteKg ? `${form.wasteKg} kg` : "Non mesuré"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                <dt className="font-semibold text-slate-500">Bénévoles</dt>
                <dd className="font-bold text-slate-900">{form.volunteersCount || "1"}</dd>
              </div>
            </dl>
          </div>
        ) : previewSrc ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={`Prévisualisation ${selectedTarget?.label ?? ""}`}
              className="block h-auto w-full"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
