import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput, CmmSelect, CmmTextarea } from "@/components/ui/cmm-field";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";
import type { FormState } from "../model";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { DIFFICULTY_OPTIONS, PLANNED_OBJECTIVE_OPTIONS } from "./model";
import { hasValidationIssue, type BaseSectionProps } from "./section-contract";
import { ExpectedWasteSection } from "./planned-action-waste-section";

export function PlannedActionVolunteerSection({
  form,
  updateField,
  validationIssueFields,
}: BaseSectionProps) {
  const volunteerParticipation = normalizeVolunteerParticipationFromForm(form);
  const hasVolunteerCategoryInput = [form.childrenCount, form.adultCount, form.retiredCount].some((value) => value.trim() !== "");
  const splitDetail = hasVolunteerCategoryInput
    ? volunteerParticipation.participantsCount === null
      ? "à compléter"
      : `${volunteerParticipation.participantsCount} répartis`
    : "facultatif";

  return (
    <section aria-labelledby="before-action-practical" className="space-y-3">
      <SectionHeading id="before-action-practical" title="Bénévoles et informations pratiques" />
      <VolunteerForecast form={form} updateField={updateField} splitDetail={splitDetail} validationIssueFields={validationIssueFields} />
      <CmmField id="before-participant-message" label="Message complémentaire aux participants" hint="Accueil et consignes utiles ; le matériel et la sécurité sont détaillés ci-dessous.">
        <CmmTextarea
          value={form.participantMessage}
          onChange={(event) => updateField("participantMessage", event.target.value)}
          rows={2}
          placeholder="Ex. Merci d’arriver 10 minutes avant."
        />
      </CmmField>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField label="Type d’action prévue" value={form.plannedObjective} onChange={(value) => updateField("plannedObjective", value as FormState["plannedObjective"])} options={PLANNED_OBJECTIVE_OPTIONS} placeholder="Sélectionnez un type d’action" />
        <SelectField label="Type de zone" value={form.placeType} onChange={(value) => updateField("placeType", value)} options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} placeholder="Sélectionnez un type de zone" />
        <SelectField label="Niveau de difficulté estimé" value={form.estimatedDifficulty} onChange={(value) => updateField("estimatedDifficulty", value as FormState["estimatedDifficulty"])} options={DIFFICULTY_OPTIONS} placeholder="Sélectionnez un niveau" />
      </div>
      <ExpectedWasteSection form={form} updateField={updateField} />
    </section>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h4 id={id} className="text-base font-black text-emerald-950">{title}</h4>;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <CmmField label={label}>
      <CmmSelect value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </CmmSelect>
    </CmmField>
  );
}

export function VolunteerForecast({
  form,
  updateField,
  splitDetail,
  validationIssueFields,
}: BaseSectionProps & {
  splitDetail: string;
}) {
  return (
    <div className="space-y-3">
      <CmmField
        id="before-volunteers-count"
        label="Nombre de bénévoles attendus"
        hint="Prévision avant le terrain ; laissez vide si elle est inconnue."
        error={hasValidationIssue(validationIssueFields, "volunteersCount") ? "Indiquez un entier d’au moins 1." : undefined}
      >
        <CmmInput
          type="number"
          min="1"
          step="1"
          value={form.volunteersCount}
          onChange={(event) => updateField("volunteersCount", event.target.value)}
          placeholder="Ex. 12"
        />
      </CmmField>
      <CmmDisclosure
        id="before-volunteer-participation"
        summary={<ActionFormDisclosureSummary label="Répartition facultative" detail={splitDetail} />}
        tone="emerald"
        size="sm"
        className={hasValidationIssue(validationIssueFields, "volunteerParticipation") ? "ring-2 ring-rose-400/20" : undefined}
      >
        <div className="space-y-3">
          <p className="text-sm text-emerald-900/70">Catégories non chevauchantes ; leur somme doit correspondre au total attendu.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([["Enfants", "childrenCount"], ["Adultes", "adultCount"], ["Retraités", "retiredCount"]] as const).map(([label, field]) => (
              <CmmField key={field} id={`before-${field}`} label={label}>
                <CmmInput type="number" min="0" step="1" value={form[field]} onChange={(event) => updateField(field, event.target.value)} placeholder="0" />
              </CmmField>
            ))}
          </div>
          {hasValidationIssue(validationIssueFields, "volunteerParticipation") ? <p className="text-sm font-medium text-rose-700" role="alert">La répartition doit contenir trois catégories cohérentes avec le total.</p> : null}
        </div>
      </CmmDisclosure>
    </div>
  );
}
