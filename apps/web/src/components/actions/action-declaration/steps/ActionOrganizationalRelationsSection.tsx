"use client";

import { useId, useState } from "react";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import type { ActionOrganizationalPartner, ActionOrganizationalRelations } from "@/lib/actions/preparation-contract";
import type { FormState } from "../model";

type Props = {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

const partnerRoles: Array<{ value: ActionOrganizationalPartner["role"]; label: string }> = [
  { value: "material", label: "Matériel, dont prêt de matériel" },
  { value: "logistics", label: "Logistique" },
  { value: "funding", label: "Financement" },
  { value: "participants", label: "Participants" },
  { value: "other", label: "Autre contribution" },
];

const organizationTypes = ORGANIZER_TYPE_OPTIONS.filter((option) => option.value !== "spontaneous");

function getRelationCopy(organizerType: OrganizerType | "") {
  if (organizerType === "association" || organizerType === "student_association") {
    return {
      initiatorLabel: "Qui est à l’initiative ?",
      organizerInitiative: "Initiative de l’association",
      partnersLabel: "Autres structures partenaires",
      originHint: "Ex. membres associatifs, salariés, élèves ou étudiants. Ne répartissez pas l’effectif ici.",
    };
  }
  if (organizerType === "company") {
    return {
      initiatorLabel: "Qui est à l’initiative ?",
      organizerInitiative: "Initiative de l’entreprise",
      partnersLabel: "Associations et autres partenaires",
      originHint: "Ex. salariés, membres associatifs ou participants scolaires. Ne répartissez pas l’effectif ici.",
    };
  }
  if (organizerType === "school") {
    return {
      initiatorLabel: "Initiative de l’établissement ou d’une structure externe",
      organizerInitiative: "Initiative de l’établissement",
      partnersLabel: "Structures partenaires",
      originHint: "Ex. étudiants, salariés ou membres associatifs. Le parcours scolaire n’impose pas de participants mineurs.",
    };
  }
  return {
    initiatorLabel: "Qui est à l’initiative ?",
    organizerInitiative: "Initiative de l’organisateur principal",
    partnersLabel: "Structures partenaires",
    originHint: "Catégories descriptives facultatives ; elles ne modifient pas les effectifs déclarés.",
  };
}

export function ActionOrganizationalRelationsSection({ form, updateField }: Props) {
  const relations = form.organizationalRelations;
  const partnerKeyPrefix = useId();
  const [partnerKeys, setPartnerKeys] = useState<string[]>([]);
  const [nextPartnerKey, setNextPartnerKey] = useState(0);
  const currentPartners = relations.partners ?? [];
  const renderedPartnerKeys = currentPartners.map((_, index) => partnerKeys[index] ?? `${partnerKeyPrefix}-external-${index}`);
  const copy = getRelationCopy(form.organizerType);
  const update = (next: ActionOrganizationalRelations) => updateField("organizationalRelations", next);
  const initiator = relations.initiator;

  return (
    <section aria-labelledby="organizational-relations-title" className="space-y-4 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4">
      <div className="space-y-1">
        <h3 id="organizational-relations-title" className="font-semibold text-emerald-950">Initiative et partenaires déclarés</h3>
        <p className="text-sm text-emerald-900/70">Ces déclarations décrivent l’organisation ; elles ne vérifient pas une collaboration et n’accordent aucun accès.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-emerald-950">{copy.initiatorLabel}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
            <input type="radio" name="organizational-initiator-kind" checked={initiator?.kind === "organizer"} onChange={() => update({ ...relations, initiator: { kind: "organizer" } })} className="accent-emerald-700" />
            {copy.organizerInitiative}
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
            <input type="radio" name="organizational-initiator-kind" checked={initiator?.kind === "external_structure"} onChange={() => update({ ...relations, initiator: { kind: "external_structure", organizerType: defaultExternalType(form.organizerType), name: "" } })} className="accent-emerald-700" />
            {form.organizerType === "association" || form.organizerType === "student_association" ? "Initiative d’une autre structure" : "Initiative d’une structure externe"}
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm sm:col-span-2">
            <input type="radio" name="organizational-initiator-kind" checked={!initiator} onChange={() => update({ ...relations, initiator: undefined })} className="accent-emerald-700" />
            Non renseignée
          </label>
        </div>
      </fieldset>

      {initiator?.kind === "external_structure" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-medium text-emerald-950">Type de structure
            <select className="mt-1 block min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-3" value={initiator.organizerType} onChange={(event) => update({ ...relations, initiator: { ...initiator, organizerType: event.target.value as typeof initiator.organizerType } })}>
              {organizationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-emerald-950">Nom déclaré
            <input className="mt-1 block min-h-11 w-full rounded-lg border border-emerald-200 bg-white px-3" maxLength={120} value={initiator.name} onChange={(event) => update({ ...relations, initiator: { ...initiator, name: event.target.value } })} />
          </label>
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-emerald-950">{copy.partnersLabel}</h4>
        {currentPartners.map((partner, index) => (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" key={renderedPartnerKeys[index]}>
            <label className="sr-only" htmlFor={`org-partner-name-${index}`}>Nom du partenaire {index + 1}</label>
            <input id={`org-partner-name-${index}`} className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3" maxLength={120} placeholder="Nom de la structure" value={partner.name} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, name: event.target.value }) })} />
            <label className="sr-only" htmlFor={`org-partner-type-${index}`}>Type du partenaire {index + 1}</label>
            <select id={`org-partner-type-${index}`} className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3" value={partner.organizerType} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, organizerType: event.target.value as ActionOrganizationalPartner["organizerType"] }) })}>
              {organizationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <label className="sr-only" htmlFor={`org-partner-role-${index}`}>Contribution du partenaire {index + 1}</label>
            <select id={`org-partner-role-${index}`} className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3" value={partner.role} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, role: event.target.value as ActionOrganizationalPartner["role"] }) })}>
              {partnerRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <button type="button" className="min-h-11 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium" onClick={() => { setPartnerKeys(renderedPartnerKeys.filter((_, partnerIndex) => partnerIndex !== index)); update({ ...relations, partners: currentPartners.filter((_, partnerIndex) => partnerIndex !== index) }); }}>Retirer</button>
          </div>
        ))}
        {(relations.partners?.length ?? 0) < 10 ? (
          <button type="button" className="min-h-11 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900" onClick={() => { setPartnerKeys([...renderedPartnerKeys, `${partnerKeyPrefix}-partner-${nextPartnerKey}`]); setNextPartnerKey(nextPartnerKey + 1); update({ ...relations, partners: [...currentPartners, { organizerType: defaultPartnerType(form.organizerType), name: "", role: "other" }] }); }}>Ajouter un partenaire</button>
        ) : null}
      </div>

      <label className="block text-sm font-medium text-emerald-950">Origines descriptives facultatives des participants
        <span className="mt-1 block font-normal text-emerald-900/70">{copy.originHint}</span>
        <textarea className="mt-2 block w-full rounded-lg border border-emerald-200 bg-white p-3" rows={2} maxLength={1000} value={(relations.participantOrigins ?? []).map(({ category }) => category).join("\n")} onChange={(event) => update({ ...relations, participantOrigins: event.target.value.split(/\r?\n/).map((category) => ({ category })) })} />
      </label>
    </section>
  );
}

export function shouldShowActionOrganizationalRelations(form: FormState): boolean {
  if (form.organizerType && form.organizerType !== "spontaneous") return true;
  const relations = form.organizationalRelations;
  return Boolean(
    relations.initiator ||
    relations.partners?.length ||
    relations.participantOrigins?.length,
  );
}

function defaultExternalType(organizerType: OrganizerType | ""): Exclude<OrganizerType, "spontaneous"> {
  return organizerType === "company" ? "association" : "company";
}

function defaultPartnerType(organizerType: OrganizerType | ""): Exclude<OrganizerType, "spontaneous"> {
  return organizerType === "company" ? "association" : "company";
}

function replacePartner(partners: ActionOrganizationalPartner[], index: number, partner: ActionOrganizationalPartner) {
  return partners.map((current, partnerIndex) => partnerIndex === index ? partner : current);
}
