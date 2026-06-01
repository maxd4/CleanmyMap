import {
 ASSOCIATION_SELECTION_OPTIONS,
 ENTREPRISE_ASSOCIATION_OPTION,
} from"@/lib/actions/association-options";
import type { ActionRecordType } from "@/lib/actions/types";

const associationOptionLabels: Record<string, string> = {
"Action spontanee":"Action spontanée",
 Entreprise:"Entreprise",
};

type ActionDeclarationIdentityFieldsProps = {
 resolvedActorOptions: string[];
 recordType: ActionRecordType;
 actorName: string;
 associationName: string;
 enterpriseName: string;
 organizerAccounts: string;
 onActorNameChange: (value: string) => void;
 onAssociationNameChange: (value: string) => void;
 onEnterpriseNameChange: (value: string) => void;
 onOrganizerAccountsChange: (value: string) => void;
};

export function ActionDeclarationIdentityFields({
 resolvedActorOptions,
 recordType,
 actorName,
 associationName,
 enterpriseName,
 organizerAccounts,
 onActorNameChange,
 onAssociationNameChange,
 onEnterpriseNameChange,
 onOrganizerAccountsChange,
 }: ActionDeclarationIdentityFieldsProps) {
  const isEntrepriseMode = associationName === ENTREPRISE_ASSOCIATION_OPTION;
 const isActionMode = recordType === "action";
  const isSpontaneousAction = associationName === "Action spontanée";

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

 {isActionMode && !isSpontaneousAction && (
 <label className="flex flex-col gap-2 cmm-text-small font-semibold cmm-text-secondary">
 Organisateurs
 <input
 name="organizerAccounts"
 autoComplete="off"
 className="rounded-xl border border-slate-300 px-3 py-2 cmm-text-primary"
 value={organizerAccounts}
 onChange={(event) => onOrganizerAccountsChange(event.target.value)}
 placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
 />
 <span className="cmm-text-caption cmm-text-muted font-normal">
 Hors action spontanée, renseignez les comptes des organisateurs réels.
 </span>
 </label>
 )}

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
