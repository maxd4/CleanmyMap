import { X } from "lucide-react";
import { buildActionDeclarationExportLabel } from "@/lib/actions/exports/export-form-media";
import type { FormState } from "../model";

type ActionDeclarationExportPickerHeaderProps = {
  form: FormState;
  onClose: () => void;
};

export function ActionDeclarationExportPickerHeader({
  form,
  onClose,
}: ActionDeclarationExportPickerHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
          Export du formulaire
        </p>
        <h2
          id="action-declaration-export-title"
          className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
        >
          Choisissez le format de sortie
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {buildActionDeclarationExportLabel(form)} · {form.actionDate}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="Fermer le sélecteur d'export"
      >
        <X size={18} />
      </button>
    </div>
  );
}
