import type { FormState } from"./action-declaration-form.model";

type ActionDeclarationVisionFieldsProps = {
 form: FormState;
 onVisionBagsCountChange: (value: string) => void;
 onVisionFillLevelChange: (value: string) => void;
 onVisionDensityChange: (value: string) => void;
};

export function ActionDeclarationVisionFields({
 form,
 onVisionBagsCountChange,
 onVisionFillLevelChange,
 onVisionDensityChange,
}: ActionDeclarationVisionFieldsProps) {
 return (
 <details className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3">
 <summary className="cursor-pointer list-none cmm-text-small font-semibold text-emerald-950">
 Précisions IA (optionnel)
 </summary>
 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Nombre de sacs
 <input
 type="number"
 min="0"
 step="1"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-400"
 value={form.visionBagsCount}
 onChange={(event) => onVisionBagsCountChange(event.target.value)}
 placeholder="Ex: 3"
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Taux de remplissage (%)
 <input
 type="number"
 min="0"
 max="100"
 step="1"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-400"
 value={form.visionFillLevel}
 onChange={(event) => onVisionFillLevelChange(event.target.value)}
 placeholder="Ex: 80"
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Densité (kg/L)
 <input
 type="number"
 min="0"
 step="0.01"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-400"
 value={form.visionDensity}
 onChange={(event) => onVisionDensityChange(event.target.value)}
 placeholder="Ex: 0.15"
 />
 </label>
 </div>
 </details>
 );
}
