import {
 ASSOCIATION_SELECTION_OPTIONS,
 ENTREPRISE_ASSOCIATION_OPTION,
} from"@/lib/actions/association-options";

const associationOptionLabels: Record<string, string> = {
"Action spontanee":"Action spontanée",
 Entreprise:"Entreprise",
};

type ActionDeclarationIdentityFieldsProps = {
 resolvedActorOptions: string[];
 actorName: string;
 associationName: string;
 enterpriseName: string;
 onActorNameChange: (value: string) => void;
 onAssociationNameChange: (value: string) => void;
 onEnterpriseNameChange: (value: string) => void;
};

export function ActionDeclarationIdentityFields({
 resolvedActorOptions,
 actorName,
 associationName,
 enterpriseName,
 onActorNameChange,
 onAssociationNameChange,
 onEnterpriseNameChange,
}: ActionDeclarationIdentityFieldsProps) {
 const isEntrepriseMode = associationName === ENTREPRISE_ASSOCIATION_OPTION;

 return (
 <>
 <label className="flex flex-col gap-2 cmm-text-small font-semibold cmm-text-secondary">
 Acteur
 <select
 name="actorName"
 autoComplete="name"
 className="rounded-xl border border-slate-300 px-3 py-2 cmm-text-primary"
 value={actorName}
 onChange={(event) => onActorNameChange(event.target.value)}
 >
 {resolvedActorOptions.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small font-semibold cmm-text-secondary">
 Structure <span className="text-emerald-500">*</span>
 <select
 required
 name="associationName"
 autoComplete="organization"
 className="rounded-xl border border-slate-300 px-3 py-2 cmm-text-primary"
 value={associationName}
 onChange={(event) => onAssociationNameChange(event.target.value)}
 >
 {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {associationOptionLabels[option] ?? option}
 </option>
 ))}
 </select>
 </label>

 {isEntrepriseMode && (
 <label className="flex flex-col gap-2 cmm-text-small font-semibold cmm-text-secondary">
 Nom entreprise <span className="text-emerald-500">*</span>
 <input
 required
 name="enterpriseName"
 autoComplete="organization"
 className="rounded-xl border border-slate-300 px-3 py-2 cmm-text-primary"
 value={enterpriseName}
 onChange={(event) => onEnterpriseNameChange(event.target.value)}
 placeholder="Ex: Veolia"
 minLength={2}
 maxLength={100}
 />
 </label>
 )}
 </>
 );
}
