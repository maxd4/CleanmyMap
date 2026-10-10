import { CmmField, CmmInput, CmmTextarea } from "@/components/ui/cmm-field";
import { hasValidationIssue, type BaseSectionProps } from "./section-contract";

export function PlannedActionPresentationSection({
  form,
  updateField,
  hasAttemptedSubmit,
  validationIssueFields,
}: Pick<BaseSectionProps, "form" | "updateField" | "hasAttemptedSubmit" | "validationIssueFields">) {
  const missingTitle = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "actionTitle"));

  return (
    <section aria-labelledby="before-action-presentation" className="space-y-3">
      <SectionHeading id="before-action-presentation" title="Présentation" />
      <div className="grid gap-4">
        <CmmField
          id="before-action-title"
          label="Titre de l’action"
          required
          hint="Nom visible par les participants."
          error={missingTitle ? "Indiquez un titre pour enregistrer la préparation." : undefined}
        >
          <CmmInput
            type="text"
            value={form.actionTitle}
            onChange={(event) => updateField("actionTitle", event.target.value)}
            placeholder="Ex. Nettoyage des berges de la Seine"
          />
        </CmmField>
        <CmmField id="before-action-description" label="Description courte">
          <CmmTextarea
            value={form.shortDescription}
            onChange={(event) => updateField("shortDescription", event.target.value)}
            rows={2}
            placeholder="Contexte ou objectif en quelques lignes."
          />
        </CmmField>
      </div>
    </section>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h4 id={id} className="text-base font-black text-emerald-950">{title}</h4>;
}
