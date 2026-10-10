"use client";

import { PencilLine } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmTextarea } from "@/components/ui/cmm-field";
import { SectionLabel } from "./ui";
import type { BaseSectionProps } from "./section-contract";
import { PreparationAccessibilityFields } from "./preparation-accessibility-fields";
import { PreparationMaterialFields } from "./preparation-material-fields";
import { PreparationChecklistFields } from "./preparation-checklist-fields";
import { PreparationSecurityFields } from "./preparation-security-fields";
import {
  characterLimitError,
  characterLimitHint,
  PREPARATION_FIELD_LIMITS,
} from "./preparation-field-utils";

export function PreparationAndSafetySection({ form, updateField, embedded = false }: BaseSectionProps & { embedded?: boolean }) {
  const logisticsError = characterLimitError(
    form.logisticsNotes,
    "Les notes logistiques",
    PREPARATION_FIELD_LIMITS.logisticsNotes,
  );

  const content = (
    <div className="space-y-5">
        <SectionLabel icon={PencilLine} title="Préparation et sécurité" subtitle="Consignes, matériel et accessibilité avant publication." />

        <section aria-labelledby="before-security-group" className="space-y-3 border-b border-emerald-100 pb-5">
          <h4 id="before-security-group" className="text-base font-black text-emerald-950">Sécurité et risques</h4>
          <PreparationSecurityFields form={form} updateField={updateField} />
        </section>

        <section aria-labelledby="before-material-group" className="space-y-3 border-b border-emerald-100 pb-5">
          <h4 id="before-material-group" className="text-base font-black text-emerald-950">Matériel à prévoir</h4>
          <PreparationMaterialFields form={form} updateField={updateField} />
        </section>

        <section aria-labelledby="before-accessibility-group" className="space-y-3 border-b border-emerald-100 pb-5">
          <h4 id="before-accessibility-group" className="text-base font-black text-emerald-950">Accessibilité</h4>
          <PreparationAccessibilityFields form={form} updateField={updateField} />
        </section>

        <section aria-labelledby="before-logistics-group" className="space-y-3">
          <h4 id="before-logistics-group" className="text-base font-black text-emerald-950">Logistique et checklist</h4>
          <PreparationChecklistFields form={form} updateField={updateField} />
          <CmmDisclosure
            summary={
              <span className="flex flex-wrap items-center gap-2">
                <span>Notes logistiques facultatives</span>
                {form.logisticsNotes.trim() ? <span className="text-xs font-normal text-emerald-800">renseignées</span> : null}
              </span>
            }
            tone="emerald"
            size="sm"
          >
            <CmmField
              id="before-logistics-notes"
              label="Notes logistiques internes"
              hint={`Accès technique, transport ou lieu de repli. Les horaires, le rendez-vous et les formalités restent portés par leurs champs canoniques. ${characterLimitHint(form.logisticsNotes, PREPARATION_FIELD_LIMITS.logisticsNotes)}`}
              error={logisticsError}
            >
              <CmmTextarea
                value={form.logisticsNotes}
                onChange={(event) => updateField("logisticsNotes", event.target.value)}
                rows={2}
                maxLength={PREPARATION_FIELD_LIMITS.logisticsNotes}
                placeholder="Ex. Accès technique, transport, météo à surveiller, lieu de repli..."
              />
            </CmmField>
          </CmmDisclosure>
        </section>
    </div>
  );
  return embedded ? content : <CmmCard tone="emerald" variant="glass" size="lg">{content}</CmmCard>;
}
