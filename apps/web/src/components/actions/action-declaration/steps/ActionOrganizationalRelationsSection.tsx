"use client";

import type { FormState } from "../model";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import type { ActionOrganizationalPartner, ActionOrganizationalRelations } from "@/lib/actions/preparation-contract";

type Props = { form: FormState; updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void };
const partnerRoles: Array<{ value: ActionOrganizationalPartner["role"]; label: string }> = [
  { value: "material", label: "Matériel" }, { value: "logistics", label: "Logistique" },
  { value: "funding", label: "Financement" }, { value: "participants", label: "Participants" }, { value: "other", label: "Autre" },
];
const organizationTypes = ORGANIZER_TYPE_OPTIONS.filter((option) => option.value !== "spontaneous");

export function ActionOrganizationalRelationsSection({ form, updateField }: Props) {
  const relations = form.organizationalRelations;
  const update = (next: ActionOrganizationalRelations) => updateField("organizationalRelations", next);
  const initiator = relations.initiator;
  return <section aria-labelledby="organizational-relations-title" className="space-y-3 rounded-lg border p-4">
    <h3 id="organizational-relations-title" className="font-semibold">Initiative et partenaires déclarés</h3>
    <p className="text-sm text-muted-foreground">Ces déclarations décrivent l’organisation. Elles ne vérifient pas une collaboration et n’accordent aucun accès.</p>
    <label className="block text-sm">Initiative
      <select className="mt-1 block w-full rounded border p-2" value={initiator?.kind ?? ""} onChange={(event) => update({ ...relations, initiator: event.target.value === "organizer" ? { kind: "organizer" } : event.target.value === "external_structure" ? { kind: "external_structure", organizerType: "school", name: "" } : undefined })}>
        <option value="">Non renseignée</option><option value="organizer">Organisateur principal</option><option value="external_structure">Structure externe</option>
      </select>
    </label>
    {initiator?.kind === "external_structure" ? <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-sm">Type de structure<select className="mt-1 block w-full rounded border p-2" value={initiator.organizerType} onChange={(event) => update({ ...relations, initiator: { ...initiator, organizerType: event.target.value as typeof initiator.organizerType } })}>{organizationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-sm">Nom déclaré<input className="mt-1 block w-full rounded border p-2" maxLength={120} value={initiator.name} onChange={(event) => update({ ...relations, initiator: { ...initiator, name: event.target.value } })} /></label>
    </div> : null}
    <div className="space-y-2"><h4 className="text-sm font-medium">Partenaires déclarés</h4>
      {(relations.partners ?? []).map((partner, index) => <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]" key={`${index}-${partner.name}`}>
        <label className="sr-only" htmlFor={`org-partner-name-${index}`}>Nom du partenaire {index + 1}</label><input id={`org-partner-name-${index}`} className="rounded border p-2" maxLength={120} placeholder="Nom de la structure" value={partner.name} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, name: event.target.value }) })} />
        <label className="sr-only" htmlFor={`org-partner-type-${index}`}>Type du partenaire {index + 1}</label><select id={`org-partner-type-${index}`} className="rounded border p-2" value={partner.organizerType} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, organizerType: event.target.value as ActionOrganizationalPartner["organizerType"] }) })}>{organizationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <label className="sr-only" htmlFor={`org-partner-role-${index}`}>Rôle du partenaire {index + 1}</label><select id={`org-partner-role-${index}`} className="rounded border p-2" value={partner.role} onChange={(event) => update({ ...relations, partners: replacePartner(relations.partners ?? [], index, { ...partner, role: event.target.value as ActionOrganizationalPartner["role"] }) })}>{partnerRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        <button type="button" className="rounded border px-3" onClick={() => update({ ...relations, partners: (relations.partners ?? []).filter((_, partnerIndex) => partnerIndex !== index) })}>Retirer</button>
      </div>)}
      {(relations.partners?.length ?? 0) < 10 ? <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => update({ ...relations, partners: [...(relations.partners ?? []), { organizerType: "school", name: "", role: "other" }] })}>Ajouter un partenaire</button> : null}
    </div>
    <label className="block text-sm">Origines descriptives des participants (une catégorie par ligne)
      <textarea className="mt-1 block w-full rounded border p-2" rows={2} maxLength={1000} value={(relations.participantOrigins ?? []).map(({ category }) => category).join("\n")} onChange={(event) => update({ ...relations, participantOrigins: event.target.value.split(/\r?\n/).map((category) => category.trim()).filter(Boolean).slice(0, 12).map((category) => ({ category })) })} />
    </label>
  </section>;
}

function replacePartner(partners: ActionOrganizationalPartner[], index: number, partner: ActionOrganizationalPartner) {
  return partners.map((current, partnerIndex) => partnerIndex === index ? partner : current);
}
