"use client";

import type { FormState } from "../model";
import type { OrganizerType } from "@/lib/actions/organizer-type";

const organizerTypeLabels: Record<OrganizerType, string> = {
  spontaneous: "Spontanée",
  association: "Association",
  student_association: "Association étudiante",
  company: "Entreprise",
  collective: "Collectif",
  school: "Établissement scolaire/universitaire",
  local_authority: "Collectivité",
  other: "Autre",
};

const organizerTypeOrder: readonly OrganizerType[] = [
  "spontaneous",
  "association",
  "student_association",
  "company",
  "collective",
  "school",
  "local_authority",
  "other",
];

type Props = {
  value: FormState["organizerType"];
  required: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: (value: FormState["organizerType"]) => void;
};

export function getOrganizerFieldPresentation(organizerType: FormState["organizerType"]) {
  switch (organizerType) {
    case "spontaneous": return { label: "Créateur ou référent", description: "Le créateur reste le référent de cette action." };
    case "association": return { label: "Association organisatrice", description: "Choisissez ou saisissez l’association qui porte l’action." };
    case "student_association": return { label: "Association étudiante organisatrice", description: "L’établissement peut être déclaré séparément comme initiateur ou partenaire." };
    case "company": return { label: "Entreprise organisatrice", description: "Une association peut être ajoutée comme partenaire, avec son rôle." };
    case "collective": return { label: "Nom du collectif", description: "Déclarez le collectif sans le présenter comme une association constituée." };
    case "school": return { label: "Établissement organisateur", description: "Aucun participant mineur n’est requis par ce choix." };
    case "local_authority": return { label: "Collectivité organisatrice", description: "Saisissez la collectivité concernée et ses partenaires éventuels." };
    case "other": return { label: "Nom de l’organisateur", description: "Identifiez la structure ou l’organisateur principal." };
    default: return { label: "Organisateur", description: "Choisissez d’abord un parcours." };
  }
}
export function ActionOrganizerTypeChoices({ value, required, invalid, describedBy, onChange }: Props) {
  return (
    <fieldset
      id="action-organizer-type"
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      tabIndex={-1}
      className="min-w-0 space-y-2"
    >
      <legend className="text-xs font-semibold text-emerald-900/75">
        Type de structure{required ? <span aria-hidden="true"> *</span> : null}
        {required ? <span className="ml-2 text-xs font-semibold text-rose-700">Obligatoire</span> : null}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {organizerTypeOrder.map((organizerType) => (
          <label
            key={organizerType}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-emerald-500/30 ${value === organizerType ? "border-emerald-600 bg-emerald-50 text-emerald-950" : "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50/60"}`}
          >
            <input
              type="radio"
              name="action-organizer-type"
              value={organizerType}
              checked={value === organizerType}
              required={required}
              onChange={() => onChange(organizerType)}
              className="accent-emerald-700"
            />
            <span>{organizerTypeLabels[organizerType]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
