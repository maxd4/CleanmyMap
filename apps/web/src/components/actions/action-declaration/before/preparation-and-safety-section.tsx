"use client";

import { PencilLine } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { FieldShell, SectionLabel } from "./ui";
import type { BaseSectionProps } from "./section-contract";
import { PreparationAccessibilityFields } from "./preparation-accessibility-fields";
import { PreparationMaterialFields } from "./preparation-material-fields";
import { PreparationChecklistFields } from "./preparation-checklist-fields";

export function PreparationAndSafetySection({ form, updateField }: BaseSectionProps) {
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-4">
        <SectionLabel icon={PencilLine} title="Préparation et sécurité" subtitle="Consignes, matériel et accessibilité avant publication." />

        <PreparationAccessibilityFields form={form} updateField={updateField} />
        <PreparationMaterialFields form={form} updateField={updateField} />
        <PreparationChecklistFields form={form} updateField={updateField} />
        <FieldShell
          label="Notes logistiques internes"
          hint="Informations complémentaires pour l'organisation. Les horaires, le rendez-vous et les formalités restent gérés par leurs champs canoniques."
        >
          <textarea value={form.logisticsNotes} onChange={(event) => updateField("logisticsNotes", event.target.value)} className="min-h-[112px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Accès technique, transport, météo à surveiller, lieu de repli..." />
        </FieldShell>

        <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3 text-sm leading-6 text-emerald-950">
          <span className="font-bold">Bon à savoir.</span> Ce pré-formulaire ne comprend pas de tracé GPS, de récolte réelle, de photos de collecte, de bilan final ni de score d&apos;impact.
        </div>
      </div>
    </CmmCard>
  );
}
