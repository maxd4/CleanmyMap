import type { FormState, UpdateFormField } from"./types";

type ActionDeclarationQuickSectionProps = {
 form: FormState;
 updateField: UpdateFormField;
};

export function ActionDeclarationQuickSection({
 form,
 updateField,
}: ActionDeclarationQuickSectionProps) {
 return (
 <>
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Dechets collectes (kg) *
 <input
 type="number"
 step="0.1"
 min="0"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.wasteKg}
 onChange={(event) => updateField("wasteKg", event.target.value)}
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Nombre de benevoles *
 <input
 type="number"
 min="1"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.volunteersCount}
 onChange={(event) => updateField("volunteersCount", event.target.value)}
 />
 </label>
 </>
 );
}
