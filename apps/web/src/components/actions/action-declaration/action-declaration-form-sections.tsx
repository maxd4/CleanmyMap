"use client";

import type { ComponentProps } from "react";
import { CheckCircle2, Download, AlertCircle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionCollectionSection } from "./steps/action-step-identity.collection";
import { ActionOrganizerSection } from "./steps/action-step-identity.organizer";
import { ActionParticipantSection } from "./steps/action-step-identity.participants";
import { ActionTimeSection } from "./steps/action-step-identity.time";
import { ActionStepHarvest } from "./steps/ActionStepHarvest";
import { ActionStepIdentity } from "./steps/ActionStepIdentity";
import { ActionStepLocation } from "./steps/ActionStepLocation";
import type { FormState, ValidationIssue } from "./model";
import {
  getActionValidationFieldErrorId,
  getActionValidationTargetId,
} from "./action-declaration-form.model";

type IdentityProps = Omit<ComponentProps<typeof ActionStepIdentity>, "mode">;
type HarvestProps = Omit<ComponentProps<typeof ActionStepHarvest>, "mode">;
type LocationProps = Omit<ComponentProps<typeof ActionStepLocation>, "mode">;

function GroupHeading({
  id,
  number,
  title,
  description,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-emerald-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{number}</p>
        <h3 id={id} className="mt-1 text-xl font-black tracking-tight text-emerald-950">{title}</h3>
      </div>
      <p className="max-w-xl text-sm leading-6 text-emerald-900">{description}</p>
    </div>
  );
}

function ActionTitleField({ form, updateField }: Pick<IdentityProps, "form" | "updateField">) {
  return (
    <label htmlFor="action-title" className="block space-y-1.5">
      <span className="text-sm font-semibold text-emerald-950">Titre de l’action <span className="font-normal text-emerald-900/55">(facultatif)</span></span>
      <input
        id="action-title"
        type="text"
        maxLength={160}
        className="min-h-12 w-full rounded-xl border border-emerald-200/70 bg-white px-3.5 text-sm font-medium text-emerald-950 outline-none transition placeholder:text-emerald-700/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
        value={form.actionTitle}
        onChange={(event) => updateField("actionTitle", event.target.value)}
        placeholder="Ex. Nettoyage des quais"
      />
      <span className="block text-xs text-emerald-900/55">Un titre aide à retrouver l’action sans remplacer ses données de terrain.</span>
    </label>
  );
}

function ActionDeclarationReviewSummary({
  form,
  hasAttemptedSubmit,
  validationIssues,
}: Pick<ActionDeclarationFormSectionsProps, "form" | "hasAttemptedSubmit" | "validationIssues">) {
  const validationLabel = !hasAttemptedSubmit
    ? "La validation complète sera lancée par le bouton principal."
    : validationIssues.length === 0
      ? "Validation locale réussie : le récapitulatif peut être confirmé."
      : `${validationIssues.length} point${validationIssues.length > 1 ? "s" : ""} reste${validationIssues.length > 1 ? "nt" : ""} à corriger.`;
  const validationTone = hasAttemptedSubmit && validationIssues.length === 0
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : hasAttemptedSubmit
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-sky-200 bg-sky-50 text-sky-950";

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${validationTone}`} role="status" aria-live="polite">
        {hasAttemptedSubmit && validationIssues.length === 0 ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <p>{validationLabel}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Action</p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{form.actionTitle.trim() || "Titre facultatif non renseigné"}</p>
          <p className="mt-1 text-xs text-emerald-900/60">{form.actionDate || "Date à renseigner"}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Lieu</p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{form.departureLocationLabel || "Adresse à renseigner"}</p>
          <p className="mt-1 text-xs text-emerald-900/60">{form.routeTopology === "point_to_point" ? "Départ → arrivée" : "Boucle ou zone"}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Participants</p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{form.recordType === "action" ? form.volunteersCount || "Effectif à renseigner" : "Non applicable"}</p>
          <p className="mt-1 text-xs text-emerald-900/60">Présence réelle déclarée séparément des comptes.</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Résultat</p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{form.recordType === "clean_place" ? "Lieu propre" : form.wasteKg || "Mesure à renseigner"}</p>
          <p className="mt-1 text-xs text-emerald-900/60">Mesures brutes, sans proxy d’impact.</p>
        </div>
      </div>
    </div>
  );
}

export type ActionDeclarationFormSectionsProps = {
  form: FormState;
  identity: IdentityProps;
  harvest: HarvestProps;
  location: LocationProps;
  showPreparationSummary: boolean;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  submissionState: "idle" | "pending" | "success" | "error";
  onOpenExport: () => void;
};

export function ActionDeclarationValidationSummary({
  validationIssues,
}: {
  validationIssues: ValidationIssue[];
}) {
  return (
    <section
      id="action-declaration-validation-summary"
      role="alert"
      aria-labelledby="action-declaration-validation-summary-title"
      aria-live="assertive"
      className="rounded-2xl border border-rose-200 bg-[#FFF7F8] p-4 text-rose-950 shadow-sm"
    >
      <h3 id="action-declaration-validation-summary-title" className="text-sm font-bold">
        Corrigez les points suivants avant de continuer
      </h3>
      <ul className="mt-2 space-y-1.5 pl-5 text-sm text-rose-800">
        {Array.from(
          validationIssues.reduce((groups, issue) => {
            const messages = groups.get(issue.field) ?? [];
            groups.set(issue.field, [...messages, issue.message]);
            return groups;
          }, new Map<string, string[]>()),
        ).map(([field, messages]) => {
          const targetId = getActionValidationTargetId(field);
          const issueId = getActionValidationFieldErrorId(field);
          return (
            <li key={field} id={issueId}>
              {targetId ? (
                <a className="underline underline-offset-2" href={`#${targetId}`}>
                  {messages.join(" ")}
                </a>
              ) : (
                messages.join(" ")
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ActionDeclarationFormSections({
  form,
  identity,
  harvest,
  location,
  showPreparationSummary,
  hasAttemptedSubmit,
  validationIssues,
  submissionState,
  onOpenExport,
}: ActionDeclarationFormSectionsProps) {
  const isActionMode = form.recordType === "action";

  return (
    <div className="space-y-6">
      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <ActionDeclarationValidationSummary validationIssues={validationIssues} />
      ) : null}

      <section id="action-declaration-identify" aria-labelledby="action-declaration-identify-title" className="space-y-5 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm md:p-6">
        <GroupHeading id="action-declaration-identify-title" number="01" title="Identifier l’action" description="Rattachez le bilan à l’action réalisée, à son organisateur et à son lieu de référence." />
        <ActionTitleField form={identity.form} updateField={identity.updateField} />
        <ActionOrganizerSection
          form={identity.form}
          updateField={identity.updateField}
          updateFields={identity.updateFields}
          userMetadata={identity.userMetadata}
          isActionMode={isActionMode}
          hasAttemptedSubmit={identity.hasAttemptedSubmit}
          variant="full"
        />
        {isActionMode ? (
          <ActionParticipantSection
            form={identity.form}
            updateField={identity.updateField}
            userId={identity.userMetadata.userId}
            variant="supporting"
            isActionMode
            supportingFull
            showParticipantAccounts={false}
          />
        ) : null}
        <ActionStepLocation {...location} mode="primary" />
        <ActionTimeSection form={identity.form} updateField={identity.updateField} variant="duration" />
      </section>

      {isActionMode ? (
        <section id="action-declaration-participants" aria-labelledby="action-declaration-participants-title" className="space-y-5 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm md:p-6">
          <GroupHeading id="action-declaration-participants-title" number="02" title="Déclarer les participants" description="Commencez par l’effectif réellement présent ; la répartition et les comptes connus restent facultatifs." />
          <ActionParticipantSection
            form={identity.form}
            updateField={identity.updateField}
            userId={identity.userMetadata.userId}
            variant="compact"
            isActionMode
          />
          <p className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-xs leading-5 text-sky-950">
            Les participants déclarés correspondent aux personnes présentes sur le terrain. Les comptes identifiés sont une information complémentaire et ne prouvent pas une présence.
          </p>
          <ActionParticipantSection
            form={identity.form}
            updateField={identity.updateField}
            userId={identity.userMetadata.userId}
            variant="supporting"
            isActionMode
            supportingFull
            showOrganizerAccounts={false}
          />
        </section>
      ) : null}

      <section id="action-declaration-results" aria-labelledby="action-declaration-results-title" className="space-y-5 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm md:p-6">
        <GroupHeading id="action-declaration-results-title" number="03" title="Déclarer les résultats collectés" description="Saisissez les mesures observées, leur contexte de tri, les photos et vos observations, au même endroit." />
        <ActionStepHarvest {...harvest} mode="all" />
      </section>

      <section id="action-declaration-terrain" aria-labelledby="action-declaration-terrain-title" className="space-y-5 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm md:p-6">
        <GroupHeading id="action-declaration-terrain-title" number="04" title="Documenter le terrain" description="Décrivez l’environnement et le parcours réellement réalisé ; les informations préparées restent identifiées comme telles." />
        {showPreparationSummary ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
            <p className="text-sm font-bold text-amber-950">Préparation existante reprise</p>
            <p className="mt-1 text-xs leading-5 text-amber-950/75">Ces informations servent de contexte de préparation. Elles ne remplacent pas les observations et mesures de cette action.</p>
          </div>
        ) : null}
        <ActionCollectionSection form={identity.form} updateField={identity.updateField} variant="full" />
        <ActionStepLocation {...location} mode="details" />
        <ActionTimeSection form={identity.form} updateField={identity.updateField} variant="time" />
      </section>

      <section id="action-declaration-review" aria-labelledby="action-declaration-review-title" className="space-y-5 rounded-2xl border border-emerald-200/80 bg-white/75 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 border-b border-emerald-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <GroupHeading id="action-declaration-review-title" number="05" title="Vérifier et transmettre" description="Relisez les informations essentielles puis lancez la validation complète avant d’ouvrir la confirmation." />
          <button type="button" onClick={onOpenExport} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30">
            <Download size={14} aria-hidden="true" />
            Exporter le récapitulatif
          </button>
        </div>
        <ActionDeclarationReviewSummary form={form} hasAttemptedSubmit={hasAttemptedSubmit} validationIssues={validationIssues} />
        <div className="sticky bottom-3 z-20 rounded-2xl border border-emerald-300/80 bg-[#F3FBF6]/95 p-4 shadow-[0_18px_36px_-20px_rgba(6,95,70,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-900/65">
              {hasAttemptedSubmit && validationIssues.length > 0
                ? "Corrigez les points signalés avant d’ouvrir la confirmation."
                : "La confirmation ne s’ouvrira que si les données sont valides."}
            </p>
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
      </section>
    </div>
  );
}
