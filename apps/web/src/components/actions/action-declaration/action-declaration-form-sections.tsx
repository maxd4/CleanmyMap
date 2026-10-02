"use client";

import type { ComponentProps } from "react";
import { Download } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionStepHarvest } from "./steps/ActionStepHarvest";
import { ActionStepIdentity } from "./steps/ActionStepIdentity";
import { ActionStepLocation } from "./steps/ActionStepLocation";
import { ActionDeclarationDetails, type ActionDeclarationDetailsProps } from "./action-declaration-details";
import type { FormState, ValidationIssue } from "./model";

type IdentityProps = Omit<ComponentProps<typeof ActionStepIdentity>, "mode">;
type HarvestProps = Omit<ComponentProps<typeof ActionStepHarvest>, "mode">;
type LocationProps = Omit<ComponentProps<typeof ActionStepLocation>, "mode">;

function ExportButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-600 px-3 py-2 cmm-text-small font-semibold text-white shadow-sm transition-all hover:border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
      >
        <Download size={13} />
        Exporter
      </button>
    </div>
  );
}

export type ActionDeclarationFormSectionsProps = {
  form: FormState;
  identity: IdentityProps;
  harvest: HarvestProps;
  location: LocationProps;
  details: Pick<ActionDeclarationDetailsProps, "summaries" | "disclosures">;
  showPreparationSummary: boolean;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  submissionState: "idle" | "pending" | "success" | "error";
  onOpenExport: () => void;
};

export function ActionDeclarationFormSections({
  form,
  identity,
  harvest,
  location,
  details,
  showPreparationSummary,
  hasAttemptedSubmit,
  validationIssues,
  submissionState,
  onOpenExport,
}: ActionDeclarationFormSectionsProps) {
  return (
    <>
      <div className="space-y-6">
        <section aria-labelledby="action-declaration-action" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
          <div>
            <h3 id="action-declaration-action" className="text-lg font-bold text-emerald-950">Action</h3>
            <p className="mt-1 text-sm text-emerald-900/60">Les informations indispensables pour rattacher cette déclaration à l’action.</p>
          </div>
          {showPreparationSummary ? (
            <div className="rounded-xl border border-emerald-200 bg-[#ECF8EF] px-4 py-3">
              <p className="text-sm font-bold text-emerald-950">Préparation existante reprise</p>
              <p className="mt-1 text-xs leading-5 text-emerald-900/70">Les informations déjà saisies sont conservées pour compléter les résultats terrain.</p>
            </div>
          ) : null}
          <ActionStepIdentity {...identity} mode="action" />
          <ActionStepLocation {...location} mode="primary" />
          <ActionStepIdentity {...identity} mode="duration" />
        </section>

        {form.recordType === "action" ? (
          <section aria-labelledby="action-declaration-participants" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
            <div>
              <h3 id="action-declaration-participants" className="text-lg font-bold text-emerald-950">Participants</h3>
              <p className="mt-1 text-sm text-emerald-900/60">Répartition des personnes présentes et total calculé.</p>
            </div>
            <ActionStepIdentity {...identity} mode="participants" />
          </section>
        ) : null}

        <section aria-labelledby="action-declaration-results" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm">
          <div>
            <h3 id="action-declaration-results" className="text-lg font-bold text-emerald-950">Résultats essentiels</h3>
            <p className="mt-1 text-sm text-emerald-900/60">Saisissez les mesures brutes. Une valeur à 0 est une mesure valide.</p>
          </div>
          <ActionStepHarvest {...harvest} mode="essentials" />
          {form.recordType === "action" && !form.wasteKg.trim() && !form.wasteMegotsKg.trim() && !form.cigaretteButtsCount.trim() ? (
            <p className="text-xs font-medium text-amber-800">Au moins une mesure déchets ou mégots est requise.</p>
          ) : null}
        </section>

        <ActionDeclarationDetails {...details} identity={identity} harvest={harvest} location={location} />

        <div className="sticky bottom-3 z-20 rounded-2xl border border-emerald-300/80 bg-[#F3FBF6]/95 p-4 shadow-[0_18px_36px_-20px_rgba(6,95,70,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {hasAttemptedSubmit && validationIssues.length > 0 ? (
                <p role="alert" className="text-sm font-semibold text-rose-700">
                  {validationIssues.length} point{validationIssues.length > 1 ? "s" : ""} à vérifier dans le formulaire.
                </p>
              ) : (
                <p className="text-sm text-emerald-900/65">Vérifiez les mesures avant de confirmer l’envoi.</p>
              )}
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <ExportButton onOpen={onOpenExport} />
              <CmmButton
                type="submit"
                tone="primary"
                variant="default"
                size="md"
                loading={submissionState === "pending"}
                className="min-h-12 w-full shrink-0 justify-center px-5 sm:w-auto"
              >
                Vérifier et envoyer
              </CmmButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
