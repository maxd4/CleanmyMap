import {
 ASSOCIATION_SELECTION_OPTIONS,
 ENTREPRISE_ASSOCIATION_OPTION,
} from"@/lib/actions/association-options";
import type { ActionRecordType } from "@/lib/actions/types";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";

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
 <CmmField label="Acteur">
 <CmmSelect
 name="actorName"
 autoComplete="name"
 value={actorName}
 onChange={(event) => onActorNameChange(event.target.value)}
 >
 {resolvedActorOptions.map((option) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </CmmSelect>
 </CmmField>

 <CmmField label="Structure" required>
 <CmmSelect
 name="associationName"
 autoComplete="organization"
 value={associationName}
 onChange={(event) => onAssociationNameChange(event.target.value)}
 >
 {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
 <option key={option} value={option}>
 {associationOptionLabels[option] ?? option}
 </option>
 ))}
 </CmmSelect>
 </CmmField>

 {isActionMode && !isSpontaneousAction && (
 <CmmField
 label="Organisateur / Référant ayant participé à l&apos;action"
 hint="Hors action spontanée, renseignez le compte du référant ou de l&apos;organisateur ayant participé à l&apos;action. À défaut, le compte admin par défaut sera utilisé."
 >
 <CmmInput
 name="organizerAccounts"
 autoComplete="off"
 value={organizerAccounts}
 onChange={(event) => onOrganizerAccountsChange(event.target.value)}
 placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
 />
 </CmmField>
 )}

 {isEntrepriseMode && (
 <CmmField label="Nom entreprise" required>
 <CmmInput
 name="enterpriseName"
 autoComplete="organization"
 value={enterpriseName}
 onChange={(event) => onEnterpriseNameChange(event.target.value)}
 placeholder="Ex: Veolia"
 minLength={2}
 maxLength={100}
 />
 </CmmField>
 )}
 </>
 );
}
