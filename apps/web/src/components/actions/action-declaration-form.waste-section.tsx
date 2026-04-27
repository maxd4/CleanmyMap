import { PLACE_TYPE_OPTIONS } from"@/lib/actions/place-type-options";
import type { FormState } from"./action-declaration-form.model";
import { ActionDeclarationWasteAssist } from"./action-declaration-form.smart-assist";

type ActionDeclarationWasteSectionProps = {
 form: FormState;
 estimatedWasteKg: number;
 estimatedWasteKgInterval: [number, number] | null;
 onPlaceTypeChange: (value: string) => void;
 onWasteKgChange: (value: string) => void;
 onVolunteersCountChange: (value: string) => void;
};

export function ActionDeclarationWasteSection({
 form,
 estimatedWasteKg,
 estimatedWasteKgInterval,
 onPlaceTypeChange,
 onWasteKgChange,
 onVolunteersCountChange,
}: ActionDeclarationWasteSectionProps) {
 return (
 <section className="md:col-span-2 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="cmm-text-caption uppercase tracking-[0.14em] text-emerald-700">
 Déchets / impact
 </p>
 <h3 className="text-lg font-semibold cmm-text-primary">
 Volumes et qualité du ramassage
 </h3>
 </div>
 <span className="rounded-full bg-emerald-50 px-3 py-1 cmm-text-caption font-semibold text-emerald-900">
 3. Valider
 </span>
 </div>

 <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
 Type de lieu <span className="text-emerald-500">*</span>
 <select
 className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm appearance-none"
 value={form.placeType}
 onChange={(event) => onPlaceTypeChange(event.target.value)}
 >
 {PLACE_TYPE_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 <p className="cmm-text-caption cmm-text-muted font-normal mt-1">
 Sert au classement et aux rapports.
 </p>
 </label>

 <label className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 cmm-text-small font-bold cmm-text-secondary shadow-sm">
 <span className="flex items-center justify-between gap-3">
 <span>
 Déchets collectés (kg) <span className="text-emerald-500">*</span>
 </span>
 <span className="rounded-full bg-white px-3 py-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 valeur réelle
 </span>
 </span>
 <input
 type="number"
 step="0.1"
 min="0"
 className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
 value={form.wasteKg}
 onChange={(event) => onWasteKgChange(event.target.value)}
 placeholder="Ex: 12.5"
 />
 <p className="cmm-text-caption font-normal text-emerald-900/80">
 La vision aide, la saisie reste manuelle.
 </p>
 <ActionDeclarationWasteAssist
 estimatedWasteKg={estimatedWasteKg}
 estimatedWasteKgInterval={estimatedWasteKgInterval}
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
 Nombre de bénévoles <span className="text-emerald-500">*</span>
 <input
 type="number"
 min="1"
 className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
 value={form.volunteersCount}
 onChange={(event) => onVolunteersCountChange(event.target.value)}
 />
 </label>
 </section>
 );
}
