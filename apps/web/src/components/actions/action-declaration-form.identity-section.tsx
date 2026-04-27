import { ActionDeclarationIdentityFields } from"./action-declaration-form.identity-fields";
import type { FormState } from"./action-declaration-form.model";

type ActionDeclarationIdentitySectionProps = {
 resolvedActorOptions: string[];
 form: FormState;
 onActorNameChange: (value: string) => void;
 onAssociationNameChange: (value: string) => void;
 onEnterpriseNameChange: (value: string) => void;
 onActionDateChange: (value: string) => void;
};

export function ActionDeclarationIdentitySection({
 resolvedActorOptions,
 form,
 onActorNameChange,
 onAssociationNameChange,
 onEnterpriseNameChange,
 onActionDateChange,
}: ActionDeclarationIdentitySectionProps) {
 return (
 <section className="md:col-span-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="cmm-text-caption uppercase tracking-[0.14em] cmm-text-muted">
 Identité / acteur
 </p>
 <h3 className="text-lg font-semibold cmm-text-primary">
 Qui a réalisé l&apos;action ?
 </h3>
 </div>
 <span className="rounded-full bg-emerald-50 px-3 py-1 cmm-text-caption font-semibold text-emerald-900">
 1. Localiser
 </span>
 </div>
 <div className="grid gap-4 md:grid-cols-2">
 <ActionDeclarationIdentityFields
 resolvedActorOptions={resolvedActorOptions}
 actorName={form.actorName}
 associationName={form.associationName}
 enterpriseName={form.enterpriseName}
 onActorNameChange={onActorNameChange}
 onAssociationNameChange={onAssociationNameChange}
 onEnterpriseNameChange={onEnterpriseNameChange}
 />

 <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
 Date de l&apos;action <span className="text-emerald-500">*</span>
 <input
 type="date"
 className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
 value={form.actionDate}
 onChange={(event) => onActionDateChange(event.target.value)}
 />
 </label>
 </div>
 </section>
 );
}
