import { useState } from "react";
import { ActionParticipantPicker } from "../../action-participant-picker";
import {
  deriveAdultCountFromTotal,
  deriveVolunteerParticipationFromTotal,
  deriveVolunteerCountFromForm,
  getFinalVolunteerCompositionValidationMessage,
  getVolunteerActionCompositionValidationMessage,
  normalizeVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";
import type { FormState } from "../model";
import {
  Field,
  inputCls,
  compactInputCls,
} from "./action-step-identity.ui";
import { Users } from "lucide-react";
import { suggestPreActionContext } from "@/lib/actions/action-context";
import { ACTION_FIELD_ROLE_OPTIONS, normalizeActionFieldRoleCodes } from "@/lib/actions/field-roles";
import { parseOrganizerAccounts } from "../payload-identity";
import type { ActionManualInvitationStatusRecord, ActionRegistrationProjectionRecord } from "@/lib/actions/participation/registration-records";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type ParticipantSectionProps = {
  form: FormState;
  updateField: UpdateField;
  userId: string;
  variant: "compact" | "supporting" | "counts";
  isActionMode: boolean;
  hasAttemptedSubmit?: boolean;
  formIdentityKey?: number;
  supportingFull?: boolean;
  showOrganizerAccounts?: boolean;
  showParticipantAccounts?: boolean;
  participantAccountsOverride?: readonly string[];
  participantReadOnly?: boolean;
  participantTitle?: string;
  participantDescription?: string;
  participantEmptyMessage?: string;
  participantInvitationStatuses?: readonly ActionManualInvitationStatusRecord[];
  participantRegistrationStatuses?: readonly ActionRegistrationProjectionRecord[];
};

function ParticipantContextControl({
  form,
  updateField,
  inputClassName,
  contextSuggestion,
}: {
  form: FormState;
  updateField: UpdateField;
  inputClassName: string;
  contextSuggestion: ReturnType<typeof suggestPreActionContext>;
}) {
  const schoolJourneySuggested =
    form.actionContext === "school" ||
    (form.actionContext === "" && contextSuggestion.context === "school");
  return (
    <div className="space-y-1.5 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3">
      <label
        htmlFor="action-context"
        className="block text-xs font-semibold text-emerald-950"
      >
        Contexte de l’action
      </label>
      <select
        id="action-context"
        className={inputClassName}
        value={form.actionContext}
        onChange={(event) => {
          const next = event.target.value as FormState["actionContext"];
          updateField("actionContext", next);
          updateField("schoolContextConfirmed", next === "school");
        }}
      >
        <option value="">Automatique selon la composition finale</option>
        <option value="citizen">Citoyenne</option>
        <option value="company">Entreprise</option>
        <option value="school">Scolaire</option>
      </select>
      {form.actionContext === "" && contextSuggestion.context === "school" ? (
        <p className="text-xs font-semibold text-emerald-800" role="status">
          Suggestion automatique : scolaire.
        </p>
      ) : null}
      {form.actionContext !== "" ? (
        <p className="text-xs font-semibold text-emerald-800" role="status">
          Choix conservé.
        </p>
      ) : null}
      {schoolJourneySuggested ? (
        <div className="space-y-2 rounded-lg border border-sky-900/10 bg-sky-50/70 p-3 text-xs text-sky-950">
          <p className="font-semibold">Parcours école : <a className="underline" href="/learn/ecole">ouvrir</a></p>
          <p>Élèves encadrés par des adultes pour les déchets ordinaires · adultes : mégots et objets dangereux, avec gants, pinces et sacs adaptés.</p>
          {form.actionContext === "" ? (
            <p className="font-semibold text-sky-900">
              Proposition uniquement.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FinalParticipantCountInputs({
  form,
  updateField,
  hasAttemptedSubmit,
  formIdentityKey,
}: {
  form: FormState;
  updateField: UpdateField;
  hasAttemptedSubmit: boolean;
  formIdentityKey: number;
}) {
  const [interactionState, setInteractionState] = useState({
    formIdentityKey,
    hasInteracted: false,
  });
  const isCurrentForm = interactionState.formIdentityKey === formIdentityKey;

  const compositionInput = {
    adultCount: form.adultCount,
    retiredCount: form.retiredCount,
    childrenCount: form.childrenCount,
  };
  const compositionMessage = hasAttemptedSubmit || (isCurrentForm && interactionState.hasInteracted)
    ? getFinalVolunteerCompositionValidationMessage(compositionInput)
    : null;
  const volunteersCount = deriveVolunteerCountFromForm(compositionInput);
  const fields = [
    ["action-adult-count", "Adultes", "adultCount"],
    ["action-retired-count", "Retraités", "retiredCount"],
    ["action-children-count", "Enfants", "childrenCount"],
  ] as const;

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="sr-only">Composition des participants présents</legend>
      <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        {fields.map(([id, label, key], index) => (
          <div key={id} className="contents">
            <label htmlFor={id} className="min-w-0">
              <span className="sr-only">{label}</span>
              <input
                id={id}
                type="number"
                min="0"
                max="500"
                step="1"
                inputMode="numeric"
                placeholder={label}
                aria-invalid={Boolean(compositionMessage)}
                aria-describedby={compositionMessage ? "action-volunteer-composition-error" : undefined}
                className={`${compactInputCls} min-w-0 bg-[#EAF7F0] placeholder:text-emerald-800/65`}
                value={form[key]}
                onChange={(event) => {
                  setInteractionState({ formIdentityKey, hasInteracted: true });
                  updateField(key, event.target.value);
                }}
              />
            </label>
            {index < fields.length - 1 ? (
              <span aria-hidden="true" className="hidden px-1 text-lg font-bold text-emerald-700 sm:inline">+</span>
            ) : null}
          </div>
        ))}
      </div>
      {compositionMessage ? (
        <p id="action-volunteer-composition-error" className="text-xs font-medium text-rose-700" role="alert">
          {compositionMessage}
        </p>
      ) : null}
      <ParticipantContextControl
        form={form}
        updateField={updateField}
        inputClassName={compactInputCls}
        contextSuggestion={suggestPreActionContext({
          volunteersCount,
          childrenCount: form.childrenCount.trim() === "" ? null : Number(form.childrenCount),
          retiredCount: form.retiredCount.trim() === "" ? null : Number(form.retiredCount),
        })}
      />
    </fieldset>
  );
}

function ParticipantCountInputs({
  form,
  updateField,
  compact,
  finalComposition,
  hasAttemptedSubmit,
  formIdentityKey,
  adultCount,
  participation,
  compositionMessage,
  volunteersCount,
  childrenCount,
  retiredCount,
}: {
  form: FormState;
  updateField: UpdateField;
  compact: boolean;
  finalComposition: boolean;
  hasAttemptedSubmit: boolean;
  formIdentityKey: number;
  adultCount: number | null;
  participation: ReturnType<typeof normalizeVolunteerParticipation>;
  compositionMessage: string | null;
  volunteersCount: number | null;
  childrenCount: number | null;
  retiredCount: number | null;
}) {
  if (finalComposition) {
    return <FinalParticipantCountInputs form={form} updateField={updateField} hasAttemptedSubmit={hasAttemptedSubmit} formIdentityKey={formIdentityKey} />;
  }

  const inputClassName = compact ? compactInputCls : inputCls;
  const contextSuggestion = suggestPreActionContext({
    volunteersCount,
    childrenCount,
    retiredCount,
  });
  const totalInput = (
    <label htmlFor="action-volunteers-count" className="space-y-1.5">
      <span className="block text-sm font-semibold text-emerald-950">
        Nombre total de participants
      </span>
      <input
        id="action-volunteers-count"
        type="number"
        min="1"
        max="500"
        step="1"
        inputMode="numeric"
        placeholder="Ex. 8"
        className={inputClassName}
        value={form.volunteersCount}
        onChange={(event) => updateField("volunteersCount", event.target.value)}
      />
      <span className="block text-xs font-normal text-emerald-900/60">Personnes présentes sur le terrain.</span>
    </label>
  );
  const categoryInputs = ([
    ["action-children-count", "Enfants", "childrenCount"],
    ["action-retired-count", "Retraités", "retiredCount"],
  ] as const).map(([id, label, key]) => (
    <label key={id} htmlFor={id} className="space-y-1.5">
      <span className="block text-xs font-semibold text-emerald-900/75">
        {label}
      </span>
      <input
        id={id}
        type="number"
        min="0"
        max="500"
        step="1"
        inputMode="numeric"
        placeholder="0"
        className={inputClassName}
        value={form[key]}
        onChange={(event) => updateField(key, event.target.value)}
      />
    </label>
  ));
  const feedback = (
    <>
      <p className="text-xs text-emerald-900/55">
        Adultes = total − enfants − retraités.
      </p>
      <p className="text-xs font-semibold text-emerald-900/70">
        {adultCount !== null && adultCount >= 0
          ? `${adultCount} adulte${adultCount > 1 ? "s" : ""} calculé${
              adultCount > 1 ? "s" : ""
            } automatiquement`
          : "Adultes calculés automatiquement : —"}
      </p>
      {compositionMessage ? (
        <p className="text-xs font-medium text-rose-700" role="alert">
          {compositionMessage}
        </p>
      ) : null}
    </>
  );
  const group = (
    <fieldset className="space-y-2">
      <legend
        className={
          compact
            ? "text-xs font-semibold text-emerald-900/75"
            : "pl-1 text-xs font-semibold text-emerald-900/75"
        }
      >
        Composition du groupe
      </legend>
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2"
        }
      >
        {categoryInputs}
      </div>
      <div className={compact ? "" : "pl-1"}>{feedback}</div>
      <ParticipantContextControl
        form={form}
        updateField={updateField}
        inputClassName={inputClassName}
        contextSuggestion={contextSuggestion}
      />
    </fieldset>
  );
  if (compact) return <div className="space-y-2">{totalInput}{group}</div>;
  return (
    <div className="space-y-4">
      <Field icon={Users}>{totalInput}</Field>
      {group}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-emerald-900/65">
        <span>Total déclaré : {form.volunteersCount.trim() || "—"} participant(s)</span>
        <span>
          Unités opérationnelles : {participation.effectiveVolunteerUnits ?? "—"}
        </span>
      </div>
    </div>
  );
}

function ParticipantCounts({ form, updateField, compact, hasAttemptedSubmit = false, formIdentityKey = 0 }: { form: FormState; updateField: UpdateField; compact: boolean; hasAttemptedSubmit?: boolean; formIdentityKey?: number }) {
  const volunteersCount = form.volunteersCount.trim() === "" ? null : Number(form.volunteersCount);
  const childrenCount = form.childrenCount.trim() === "" ? null : Number(form.childrenCount);
  const retiredCount = form.retiredCount.trim() === "" ? null : Number(form.retiredCount);
  const adultCount = deriveAdultCountFromTotal({ volunteersCount, childrenCount, retiredCount });
  const participation = normalizeVolunteerParticipation(deriveVolunteerParticipationFromTotal({ volunteersCount, childrenCount, retiredCount }));
  const hasParticipantEntry = form.volunteersCount.trim() !== "" || form.childrenCount.trim() !== "0" || form.retiredCount.trim() !== "0";
  const compositionMessage = hasParticipantEntry ? getVolunteerActionCompositionValidationMessage({ volunteersCount, childrenCount, retiredCount }) : null;
  return (
      <ParticipantCountInputs
      form={form}
      updateField={updateField}
      compact={compact}
      finalComposition={!compact}
      hasAttemptedSubmit={hasAttemptedSubmit}
      formIdentityKey={formIdentityKey}
      adultCount={adultCount}
      participation={participation}
      compositionMessage={compositionMessage}
      volunteersCount={volunteersCount}
      childrenCount={childrenCount}
      retiredCount={retiredCount}
    />
  );
}

function SupportingParticipation({
  form,
  updateField,
  userId,
  isActionMode,
  full,
  showOrganizerAccounts,
  showParticipantAccounts,
  participantAccountsOverride,
  participantReadOnly = false,
  participantTitle = "Comptes participants identifiés",
  participantDescription = "Comptes identifiés ; présence non confirmée.",
  participantEmptyMessage = "Aucun membre ajouté pour le moment.",
  participantInvitationStatuses,
  participantRegistrationStatuses,
}: Omit<ParticipantSectionProps, "variant"> & {
  full: boolean;
  showOrganizerAccounts: boolean;
  showParticipantAccounts: boolean;
}) {
  if (!isActionMode) {
    return null;
  }

  return (
    <>
      {showOrganizerAccounts ? (
        <div className="mt-3 space-y-1">
          <ActionParticipantPicker
            currentUserId={userId}
            value={parseOrganizerAccounts(form.organizerAccounts)}
            onChange={(next) => updateField("organizerAccounts", next.join(", "))}
            endpoint="/api/actions/account-options"
            title={full ? "Comptes coorganisateurs" : "Organisateurs associés"}
            description="20 comptes max · présence terrain distincte."
            compact={!full}
            maxSelected={20}
            roleOptions={ACTION_FIELD_ROLE_OPTIONS.filter(({ code }) => code !== "organizer_primary")}
            roleSelections={form.fieldRoleSelections}
            onRoleSelectionsChange={(next) => updateField("fieldRoleSelections", Object.fromEntries(Object.entries(next).map(([userId, roleCodes]) => [userId, normalizeActionFieldRoleCodes(roleCodes)])))}
          />
        </div>
      ) : null}
      {showParticipantAccounts ? (
        <div className="mt-4">
          <ActionParticipantPicker
            currentUserId={userId}
            value={[...(participantAccountsOverride ?? form.participantAccounts)]}
            onChange={(next) => {
              if (!participantReadOnly) updateField("participantAccounts", next);
            }}
            endpoint="/api/actions/account-options"
            description={participantDescription}
            title={participantTitle}
            readOnly={participantReadOnly}
            emptyMessage={participantEmptyMessage}
            invitationStatuses={participantInvitationStatuses}
            registrationStatuses={participantRegistrationStatuses}
          />
        </div>
      ) : null}
    </>
  );
}

export function ActionParticipantSection({
  form,
  updateField,
  userId,
  variant,
  isActionMode,
  hasAttemptedSubmit = false,
  formIdentityKey = 0,
  supportingFull,
  showOrganizerAccounts = true,
  showParticipantAccounts = true,
  participantAccountsOverride,
  participantReadOnly = false,
  participantTitle,
  participantDescription,
  participantEmptyMessage,
  participantInvitationStatuses,
  participantRegistrationStatuses,
}: ParticipantSectionProps) {
  if (variant === "compact") {
    return <ParticipantCounts form={form} updateField={updateField} compact />;
  }

  if (variant === "counts") {
    return <ParticipantCounts form={form} updateField={updateField} compact={false} hasAttemptedSubmit={hasAttemptedSubmit} formIdentityKey={formIdentityKey} />;
  }

  return (
    <SupportingParticipation
      form={form}
      updateField={updateField}
      userId={userId}
      isActionMode={isActionMode}
      full={supportingFull ?? false}
      showOrganizerAccounts={showOrganizerAccounts}
      showParticipantAccounts={showParticipantAccounts}
      participantAccountsOverride={participantAccountsOverride}
      participantReadOnly={participantReadOnly}
      participantTitle={participantTitle}
      participantDescription={participantDescription}
      participantEmptyMessage={participantEmptyMessage}
      participantInvitationStatuses={participantInvitationStatuses}
      participantRegistrationStatuses={participantRegistrationStatuses}
    />
  );
}
