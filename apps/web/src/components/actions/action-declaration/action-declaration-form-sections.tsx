"use client";

import type { ComponentProps, ReactNode } from "react";
import { CheckCircle2, Download, AlertCircle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionCollectionSection } from "./steps/action-step-identity.collection";
import { ActionOrganizerSection } from "./steps/action-step-identity.organizer";
import { ActionParticipantSection } from "./steps/action-step-identity.participants";
import { ActionTimeSection } from "./steps/action-step-identity.time";
import { ActionStepHarvest } from "./steps/ActionStepHarvest";
import { ActionStepIdentity } from "./steps/ActionStepIdentity";
import { ActionStepLocation } from "./steps/ActionStepLocation";
import type {
  ActionDeclarationValidationStatus,
  FormState,
  SubmissionState,
  ValidationIssue,
} from "./model";
import {
  getActionValidationFieldErrorId,
  getActionValidationTargetId,
} from "./action-declaration-form.model";
import { deriveVolunteerCountFromForm } from "@/lib/actions/volunteer-participation";

type IdentityProps = Omit<ComponentProps<typeof ActionStepIdentity>, "mode">;
type HarvestProps = Omit<ComponentProps<typeof ActionStepHarvest>, "mode">;
type LocationProps = Omit<ComponentProps<typeof ActionStepLocation>, "mode">;

function GroupHeading({
  id,
  number,
  title,
  action,
}: {
  id: string;
  number: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-emerald-200/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="shrink-0 text-sm font-black uppercase tracking-[0.16em] text-emerald-700">{number}</span>
        <span aria-hidden="true" className="shrink-0 text-lg font-semibold text-emerald-400">|</span>
        <h3 id={id} className="min-w-0 text-[clamp(1.75rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight text-emerald-950 md:whitespace-nowrap">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function ActionTitleField({ form, updateField }: Pick<IdentityProps, "form" | "updateField">) {
  return (
    <label htmlFor="action-title" className="block min-w-0 space-y-1.5">
      <span className="sr-only">Titre de l’action (facultatif)</span>
      <input
        id="action-title"
        type="text"
        maxLength={160}
        className="min-h-12 w-full rounded-xl border border-emerald-200/70 bg-[#EAF7F0] px-3.5 text-sm font-medium text-emerald-950 outline-none transition placeholder:text-emerald-800/65 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        value={form.actionTitle}
        onChange={(event) => updateField("actionTitle", event.target.value)}
        placeholder="TITRE DE L’ACTION · Ex. Nettoyage des quais"
      />
    </label>
  );
}

function ActionDeclarationReviewSummary({
  form,
  hasAttemptedSubmit,
  validationIssues,
  submissionState,
  validationStatus,
  errorMessage,
}: Pick<ActionDeclarationFormSectionsProps, "form" | "hasAttemptedSubmit" | "validationIssues" | "submissionState" | "validationStatus" | "errorMessage">) {
  const validationPresentation = getReviewValidationPresentation({
    hasAttemptedSubmit,
    validationIssues,
    submissionState,
    validationStatus,
    errorMessage,
  });
  const derivedVolunteersCount = deriveVolunteerCountFromForm({
    adultCount: form.adultCount,
    retiredCount: form.retiredCount,
    childrenCount: form.childrenCount,
  });
  const hasCategoryInput = [form.adultCount, form.retiredCount, form.childrenCount]
    .some((value) => value.trim() !== "");
  const participantsSummary = form.recordType !== "action"
    ? "Non applicable"
    : derivedVolunteersCount !== null
      ? String(derivedVolunteersCount)
      : hasCategoryInput
        ? "Effectif à compléter"
        : form.volunteersCount || "Effectif à renseigner";

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${validationPresentation.tone}`} role="status" aria-live="polite">
        {validationPresentation.success ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <p>{validationPresentation.label}</p>
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
          <p className="mt-1 text-sm font-bold text-emerald-950">{participantsSummary}</p>
          <p className="mt-1 text-xs text-emerald-900/60">Présence terrain distincte.</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Résultat</p>
          <p className="mt-1 text-sm font-bold text-emerald-950">{form.recordType === "clean_place" ? "Lieu propre" : form.wasteKg || "Mesure à renseigner"}</p>
        </div>
      </div>
    </div>
  );
}

function getReviewValidationPresentation({
  hasAttemptedSubmit,
  validationIssues,
  submissionState,
  validationStatus,
  errorMessage,
}: {
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  submissionState: SubmissionState;
  validationStatus: ActionDeclarationValidationStatus;
  errorMessage: string | null;
}) {
  if (!hasAttemptedSubmit || validationStatus === "not_attempted") {
    return {
      label: "Validation en attente.",
      tone: "border-sky-200 bg-sky-50 text-sky-950",
      success: false,
    };
  }

  if (validationIssues.length > 0 || validationStatus === "field_errors") {
    return {
      label: `${validationIssues.length} point${validationIssues.length > 1 ? "s" : ""} reste${validationIssues.length > 1 ? "nt" : ""} à corriger.`,
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      success: false,
    };
  }

  if (submissionState === "pending") {
    return {
      label: "Transmission en cours…",
      tone: "border-sky-200 bg-sky-50 text-sky-950",
      success: false,
    };
  }

  if (submissionState === "success" || validationStatus === "transmitted") {
    return {
      label: "Transmission réussie.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      success: true,
    };
  }

  if (submissionState === "error" && validationStatus === "transmission_error") {
    return {
      label: `Transmission impossible${errorMessage ? ` : ${errorMessage}` : "."}`,
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      success: false,
    };
  }

  if (validationStatus === "blocked" || submissionState === "error") {
    return {
      label: `Vérification bloquée${errorMessage ? ` : ${errorMessage}` : "."}`,
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      success: false,
    };
  }

  return {
    label: "Validation locale réussie : le récapitulatif peut être confirmé.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    success: true,
  };
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
  validationStatus: ActionDeclarationValidationStatus;
  errorMessage: string | null;
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
  validationStatus,
  errorMessage,
  onOpenExport,
}: ActionDeclarationFormSectionsProps) {
  const isActionMode = form.recordType === "action";

  return (
    <div className="space-y-5">
      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <ActionDeclarationValidationSummary validationIssues={validationIssues} />
      ) : null}

      <section id="action-declaration-identify" aria-labelledby="action-declaration-identify-title" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-4 shadow-sm md:p-5">
        <GroupHeading id="action-declaration-identify-title" number="01" title="Identifier l’action" />
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ActionTitleField form={identity.form} updateField={identity.updateField} />
          <ActionOrganizerSection
            form={identity.form}
            updateField={identity.updateField}
            updateFields={identity.updateFields}
            userMetadata={identity.userMetadata}
            isActionMode={isActionMode}
            hasAttemptedSubmit={identity.hasAttemptedSubmit}
            variant="identity-meta"
          />
        </div>
        <ActionStepLocation {...location} mode="primary" />
        <ActionTimeSection form={identity.form} updateField={identity.updateField} variant="duration" />
      </section>

      {isActionMode ? (
        <section id="action-declaration-participants" aria-labelledby="action-declaration-participants-title" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-4 shadow-sm md:p-5">
          <GroupHeading id="action-declaration-participants-title" number="02" title="Déclarer les participants" />
          <ActionParticipantSection
            form={identity.form}
            updateField={identity.updateField}
            userId={identity.userMetadata.userId}
            variant="counts"
            isActionMode
            hasAttemptedSubmit={hasAttemptedSubmit}
          />
          <ActionParticipantSection
            form={identity.form}
            updateField={identity.updateField}
            userId={identity.userMetadata.userId}
            variant="supporting"
            isActionMode
            supportingFull
            showOrganizerAccounts={false}
            participantTitle="Comptes participants identifiés"
            participantDescription="Comptes identifiés ; présence non confirmée."
          />
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <ActionOrganizerSection
              form={identity.form}
              updateField={identity.updateField}
              updateFields={identity.updateFields}
              userMetadata={identity.userMetadata}
              isActionMode={isActionMode}
              hasAttemptedSubmit={identity.hasAttemptedSubmit}
              variant="identity-association"
            />
            <ActionParticipantSection
              form={identity.form}
              updateField={identity.updateField}
              userId={identity.userMetadata.userId}
              variant="supporting"
              isActionMode
              supportingFull
              showParticipantAccounts={false}
            />
          </div>
        </section>
      ) : null}

      <section id="action-declaration-results" aria-labelledby="action-declaration-results-title" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-4 shadow-sm md:p-5">
        <GroupHeading id="action-declaration-results-title" number="03" title="Déclarer les résultats collectés" />
        <ActionStepHarvest {...harvest} mode="all" />
      </section>

      <section id="action-declaration-terrain" aria-labelledby="action-declaration-terrain-title" className="space-y-3 rounded-2xl border border-emerald-200/80 bg-white/75 p-3 shadow-sm md:p-4">
        <GroupHeading id="action-declaration-terrain-title" number="04" title="Documenter le terrain" />
        {showPreparationSummary ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2">
            <p className="text-xs font-bold text-amber-950">Préparation existante reprise</p>
            <p className="mt-0.5 text-xs leading-4 text-amber-950/75">Contexte préparé · non observé.</p>
          </div>
        ) : null}
        <ActionCollectionSection form={identity.form} updateField={identity.updateField} variant="full" />
        <ActionStepLocation {...location} mode="details" />
        <ActionTimeSection form={identity.form} updateField={identity.updateField} variant="time" />
      </section>

      <section id="action-declaration-review" aria-labelledby="action-declaration-review-title" className="space-y-4 rounded-2xl border border-emerald-200/80 bg-white/75 p-4 shadow-sm md:p-5">
        <GroupHeading
          id="action-declaration-review-title"
          number="05"
          title="Vérifier et transmettre"
          action={(
            <button type="button" onClick={onOpenExport} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30">
              <Download size={14} aria-hidden="true" />
              Exporter le récapitulatif
            </button>
          )}
        />
        <ActionDeclarationReviewSummary
          form={form}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssues={validationIssues}
          submissionState={submissionState}
          validationStatus={validationStatus}
          errorMessage={errorMessage}
        />
        <div className="sticky bottom-3 z-20 rounded-2xl border border-emerald-300/80 bg-[#F3FBF6]/95 p-4 shadow-[0_18px_36px_-20px_rgba(6,95,70,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-900/65">
              {hasAttemptedSubmit && validationIssues.length > 0
                ? "Corrigez les points signalés."
                : "Données valides requises."}
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
