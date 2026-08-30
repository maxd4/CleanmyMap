import { PLACE_TYPE_FORM_OPTIONS, normalizePlaceTypeForUi } from"@/lib/actions/place-type-options";
import type { FormState } from"./model";
import { ActionDeclarationWasteAssist } from"./action-declaration-form.smart-assist";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";

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

 <CmmField label="Type de lieu" required hint="Sert au classement et aux rapports.">
<CmmSelect
value={normalizePlaceTypeForUi(form.placeType)}
onChange={(event) => onPlaceTypeChange(event.target.value)}
>
 {PLACE_TYPE_FORM_OPTIONS.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
</CmmSelect>
 </CmmField>

 <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 cmm-text-small font-bold cmm-text-secondary shadow-sm">
 <CmmField
 label={(
 <span className="flex items-center justify-between gap-3">
 <span>Déchets collectés (kg)</span>
 <span className="rounded-full bg-white px-3 py-1 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 valeur réelle
 </span>
 </span>
 )}
 required
 hint="La vision aide, la saisie reste manuelle."
 >
 <CmmInput
 type="number"
 step="0.1"
 min="0"
 value={form.wasteKg}
 onChange={(event) => onWasteKgChange(event.target.value)}
 placeholder="Ex: 12.5"
 />
 </CmmField>
 <ActionDeclarationWasteAssist
 estimatedWasteKg={estimatedWasteKg}
 estimatedWasteKgInterval={estimatedWasteKgInterval}
 />
 </div>

 <CmmField label="Nombre de bénévoles" required>
 <CmmInput
 type="number"
 min="1"
 value={form.volunteersCount}
 onChange={(event) => onVolunteersCountChange(event.target.value)}
 />
 </CmmField>
 </section>
 );
}
