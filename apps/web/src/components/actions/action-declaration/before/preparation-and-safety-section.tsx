"use client";

import { PencilLine } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { FieldShell, SectionLabel } from "./ui";
import type { BaseSectionProps } from "./section-contract";

export function PreparationAndSafetySection({ form, updateField }: BaseSectionProps) {
  return (
    <CmmCard tone="emerald" variant="glass" size="lg">
      <div className="space-y-4">
        <SectionLabel icon={PencilLine} title="Préparation et sécurité" subtitle="Consignes, matériel et accessibilité avant publication." />

        <div className="space-y-4">
          <FieldShell label="Accessibilité">
            <textarea value={form.accessibility} onChange={(event) => updateField("accessibility", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Accessible PMR partiellement, escalier à éviter..." />
          </FieldShell>
          <FieldShell label="Consignes de sécurité">
            <textarea value={form.safetyInstructions} onChange={(event) => updateField("safetyInstructions", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Ne pas traverser la voie ferrée, rester en groupe, gilets visibles..." />
          </FieldShell>
        </div>

        <FieldShell label="Matériel conseillé">
          <textarea value={form.recommendedMaterials} onChange={(event) => updateField("recommendedMaterials", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Gants, sacs, pinces, chasubles, eau..." />
        </FieldShell>
        <FieldShell label="Commentaire logistique">
          <textarea value={form.logisticsNotes} onChange={(event) => updateField("logisticsNotes", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Accès, transport, météo à surveiller, lieu de repli, risques connus..." />
        </FieldShell>
        <FieldShell label="Checklist avant départ">
          <textarea value={form.checklistBeforeDeparture} onChange={(event) => updateField("checklistBeforeDeparture", event.target.value)} className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Ex. Matériel prêt, groupe informé, point de rendez-vous confirmé, sécurité rappelée." />
        </FieldShell>

        <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3 text-sm leading-6 text-emerald-950">
          <span className="font-bold">Bon à savoir.</span> Ce pré-formulaire ne comprend pas de tracé GPS, de récolte réelle, de photos de collecte, de bilan final ni de score d&apos;impact.
        </div>
      </div>
    </CmmCard>
  );
}
